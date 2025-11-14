import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function BusinessDashboardPage() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/login");
  }

  // Check if user is BUSINESS_OWNER or ADMIN
  if (session.user.role !== "BUSINESS_OWNER" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  try {
    // Get business account
    const businessAccount = await prisma.businessAccount.findUnique({
      where: { userId: session.user.id },
      include: {
        places: {
          include: {
            city: {
              select: {
                nameRu: true,
                nameEn: true,
              },
            },
            _count: {
              select: {
                services: {
                  where: {
                    isActive: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!businessAccount && session.user.role === "BUSINESS_OWNER") {
      // Create business account if it doesn't exist
      const newBusinessAccount = await prisma.businessAccount.create({
        data: {
          userId: session.user.id,
        },
        include: {
          places: {
            include: {
              city: {
                select: {
                  nameRu: true,
                  nameEn: true,
                },
              },
              _count: {
                select: {
                  services: {
                    where: {
                      isActive: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      return renderDashboard(newBusinessAccount.places);
    }

    return renderDashboard(businessAccount?.places ?? []);
  } catch (error) {
    console.error("Business dashboard error:", error);
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-4xl flex-col gap-6 px-4 py-16">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <h2 className="text-lg font-semibold text-destructive">Error loading dashboard</h2>
          <p className="text-sm text-muted-foreground">
            An error occurred while loading the business dashboard. Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }
}

function renderDashboard(places: Array<{
  id: string;
  name: string;
  address: string | null;
  status: string;
  city: { nameRu: string; nameEn: string };
  _count: { services: number };
}>) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-4xl flex-col gap-6 px-4 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Business Dashboard</h1>
      </div>

      {places.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <p className="mb-4">You don't have any places yet.</p>
              <p className="text-sm">Contact support to add your first place.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {places.map((place) => (
            <Card key={place.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl">{place.name}</CardTitle>
                  <Badge
                    variant={
                      place.status === "published"
                        ? "default"
                        : place.status === "approved"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {place.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">City:</span> {place.city.nameRu}
                  </div>
                  {place.address && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Address:</span> {place.address}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Active services:</span> {place._count.services}
                  </div>
                  <div className="pt-2">
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/business/places/${place.id}/services`}>
                        Manage Services
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

