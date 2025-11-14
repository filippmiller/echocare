import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { unauthorized, badRequest, notFound, internalServerError } from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";
import { checkPlaceOwnership } from "@/lib/modules/business/permissions";
import { z } from "zod";

const createPlaceServiceSchema = z.object({
  serviceTypeId: z.string().min(1),
  priceFrom: z.number().positive().nullable().optional(),
  priceTo: z.number().positive().nullable().optional(),
  currency: z.string().default("RUB"),
  durationMinutes: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().default(true),
  isSpecialOffer: z.boolean().default(false),
  specialLabel: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * GET /api/business/places/[placeId]/services
 * Get all services for a place
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ placeId: string }> }
) {
  try {
    const session = await getServerAuthSession();
    const { placeId } = await params;

    const ownership = await checkPlaceOwnership(session, placeId);
    if (!ownership) {
      return unauthorized();
    }

    const services = await prisma.placeService.findMany({
      where: { placeId },
      include: {
        serviceType: {
          include: {
            category: {
              select: {
                id: true,
                code: true,
                nameRu: true,
                nameEn: true,
                icon: true,
              },
            },
          },
        },
      },
      orderBy: [
        { serviceType: { category: { sortOrder: "asc" } } },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ services }, { status: 200 });
  } catch (error) {
    console.error("Get place services error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return internalServerError(`Failed to get services: ${errorMessage}`);
  }
}

/**
 * POST /api/business/places/[placeId]/services
 * Create a new service for a place
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ placeId: string }> }
) {
  try {
    const session = await getServerAuthSession();
    const { placeId } = await params;

    const ownership = await checkPlaceOwnership(session, placeId);
    if (!ownership) {
      return unauthorized();
    }

    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = createPlaceServiceSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(`Invalid request body: ${parsed.error.message}`);
    }

    const data = parsed.data;

    // Verify service type exists and is active
    const serviceType = await prisma.serviceType.findUnique({
      where: { id: data.serviceTypeId },
    });

    if (!serviceType) {
      return notFound("Service type not found");
    }

    if (!serviceType.isActive) {
      return badRequest("Service type is not active");
    }

    // Check if service already exists for this place
    const existing = await prisma.placeService.findUnique({
      where: {
        placeId_serviceTypeId: {
          placeId,
          serviceTypeId: data.serviceTypeId,
        },
      },
    });

    if (existing) {
      return badRequest("Service already exists for this place");
    }

    // Create place service
    const placeService = await prisma.placeService.create({
      data: {
        placeId,
        serviceTypeId: data.serviceTypeId,
        priceFrom: data.priceFrom ?? null,
        priceTo: data.priceTo ?? null,
        currency: data.currency,
        durationMinutes: data.durationMinutes ?? null,
        isActive: data.isActive,
        isSpecialOffer: data.isSpecialOffer,
        specialLabel: data.specialLabel ?? null,
        notes: data.notes ?? null,
      },
      include: {
        serviceType: {
          include: {
            category: {
              select: {
                id: true,
                code: true,
                nameRu: true,
                nameEn: true,
                icon: true,
              },
            },
          },
        },
      },
    });

    console.log(`business.service.added: placeId=${placeId}, serviceId=${placeService.id}, serviceType=${serviceType.code}`);

    return NextResponse.json({ service: placeService }, { status: 201 });
  } catch (error) {
    console.error("Create place service error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return internalServerError(`Failed to create service: ${errorMessage}`);
  }
}

