import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPlaceOwnership } from "@/lib/modules/business/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlaceServicesList } from "@/components/business/place-services-list";

export const dynamic = "force-dynamic";

export default async function PlaceServicesPage({
  params,
}: {
  params: Promise<{ placeId: string }>;
}) {
  const session = await getServerAuthSession();
  const { placeId } = await params;

  if (!session) {
    redirect("/login");
  }

  const ownership = await checkPlaceOwnership(session, placeId);
  if (!ownership) {
    redirect("/business/dashboard");
  }

  try {
    const place = await prisma.place.findUnique({
      where: { id: placeId },
      include: {
        city: {
          select: {
            nameRu: true,
            nameEn: true,
          },
        },
        services: {
          where: { isActive: true },
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
        },
      },
    });

    if (!place) {
      redirect("/business/dashboard");
    }

    return (
      <div className="mx-auto flex min-h-[60vh] max-w-6xl flex-col gap-6 px-4 py-16">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/business/dashboard" className="text-sm text-muted-foreground hover:underline">
              ← Back to Dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{place.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {place.city.nameRu} {place.address && `• ${place.address}`}
            </p>
            <Badge className="mt-2" variant={place.status === "published" ? "default" : "secondary"}>
              {place.status}
            </Badge>
          </div>
        </div>

        <PlaceServicesList placeId={placeId} initialServices={place.services} />
      </div>
    );
  } catch (error) {
    console.error("Place services page error:", error);
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-6xl flex-col gap-6 px-4 py-16">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <h2 className="text-lg font-semibold text-destructive">Error loading services</h2>
          <p className="text-sm text-muted-foreground">
            An error occurred while loading services. Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }
}

