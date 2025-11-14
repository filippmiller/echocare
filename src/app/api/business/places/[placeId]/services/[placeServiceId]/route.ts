import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { unauthorized, badRequest, notFound, internalServerError } from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";
import { checkPlaceOwnership } from "@/lib/modules/business/permissions";
import { z } from "zod";

const updatePlaceServiceSchema = z.object({
  priceFrom: z.number().positive().nullable().optional(),
  priceTo: z.number().positive().nullable().optional(),
  currency: z.string().optional(),
  durationMinutes: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
  isSpecialOffer: z.boolean().optional(),
  specialLabel: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * PATCH /api/business/places/[placeId]/services/[placeServiceId]
 * Update a place service
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ placeId: string; placeServiceId: string }> }
) {
  try {
    const session = await getServerAuthSession();
    const { placeId, placeServiceId } = await params;

    const ownership = await checkPlaceOwnership(session, placeId);
    if (!ownership) {
      return unauthorized();
    }

    // Verify service belongs to this place
    const existingService = await prisma.placeService.findUnique({
      where: { id: placeServiceId },
    });

    if (!existingService) {
      return notFound("Service not found");
    }

    if (existingService.placeId !== placeId) {
      return unauthorized();
    }

    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = updatePlaceServiceSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(`Invalid request body: ${parsed.error.message}`);
    }

    const data = parsed.data;

    // Update service
    const updatedService = await prisma.placeService.update({
      where: { id: placeServiceId },
      data: {
        ...(data.priceFrom !== undefined && { priceFrom: data.priceFrom }),
        ...(data.priceTo !== undefined && { priceTo: data.priceTo }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isSpecialOffer !== undefined && { isSpecialOffer: data.isSpecialOffer }),
        ...(data.specialLabel !== undefined && { specialLabel: data.specialLabel }),
        ...(data.notes !== undefined && { notes: data.notes }),
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

    console.log(`business.service.updated: placeId=${placeId}, serviceId=${placeServiceId}`);

    return NextResponse.json({ service: updatedService }, { status: 200 });
  } catch (error) {
    console.error("Update place service error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return internalServerError(`Failed to update service: ${errorMessage}`);
  }
}

/**
 * DELETE /api/business/places/[placeId]/services/[placeServiceId]
 * Delete (deactivate) a place service
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ placeId: string; placeServiceId: string }> }
) {
  try {
    const session = await getServerAuthSession();
    const { placeId, placeServiceId } = await params;

    const ownership = await checkPlaceOwnership(session, placeId);
    if (!ownership) {
      return unauthorized();
    }

    // Verify service belongs to this place
    const existingService = await prisma.placeService.findUnique({
      where: { id: placeServiceId },
    });

    if (!existingService) {
      return notFound("Service not found");
    }

    if (existingService.placeId !== placeId) {
      return unauthorized();
    }

    // Soft delete: set isActive to false
    await prisma.placeService.update({
      where: { id: placeServiceId },
      data: { isActive: false },
    });

    console.log(`business.service.deleted: placeId=${placeId}, serviceId=${placeServiceId}`);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete place service error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return internalServerError(`Failed to delete service: ${errorMessage}`);
  }
}

