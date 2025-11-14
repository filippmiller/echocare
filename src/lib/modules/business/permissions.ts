import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

/**
 * Check if user owns a place (is BUSINESS_OWNER and place belongs to their business account)
 * Returns the place if valid, null otherwise
 */
export async function checkPlaceOwnership(
  session: Session | null,
  placeId: string
): Promise<{ place: { id: string; businessId: string; name: string } } | null> {
  if (!session) {
    return null;
  }

  // ADMIN can access any place
  if (session.user.role === "ADMIN") {
    const place = await prisma.place.findUnique({
      where: { id: placeId },
      select: {
        id: true,
        businessId: true,
        name: true,
      },
    });
    return place ? { place } : null;
  }

  // BUSINESS_OWNER can only access their own places
  if (session.user.role !== "BUSINESS_OWNER") {
    return null;
  }

  // Find business account for this user
  const businessAccount = await prisma.businessAccount.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!businessAccount) {
    return null;
  }

  // Check if place belongs to this business account
  const place = await prisma.place.findFirst({
    where: {
      id: placeId,
      businessId: businessAccount.id,
    },
    select: {
      id: true,
      businessId: true,
      name: true,
    },
  });

  return place ? { place } : null;
}

/**
 * Check if user is BUSINESS_OWNER or ADMIN
 */
export function isBusinessUser(session: Session | null): boolean {
  if (!session) {
    return false;
  }
  return session.user.role === "BUSINESS_OWNER" || session.user.role === "ADMIN";
}

