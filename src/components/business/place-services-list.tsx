"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit } from "lucide-react";
import { AddServiceModal } from "./add-service-modal";

interface ServiceType {
  id: string;
  code: string;
  nameRu: string;
  nameEn: string;
  category: {
    id: string;
    code: string;
    nameRu: string;
    nameEn: string;
    icon: string | null;
  };
}

interface PlaceService {
  id: string;
  priceFrom: number | null;
  priceTo: number | null;
  currency: string;
  durationMinutes: number | null;
  isActive: boolean;
  isSpecialOffer: boolean;
  specialLabel: string | null;
  serviceType: ServiceType;
}

interface PlaceServicesListProps {
  placeId: string;
  initialServices: PlaceService[];
}

export function PlaceServicesList({ placeId, initialServices }: PlaceServicesListProps) {
  const [services, setServices] = useState<PlaceService[]>(initialServices);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadServices = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/business/places/${placeId}/services`);
      if (!response.ok) {
        throw new Error("Failed to load services");
      }
      const data = (await response.json()) as { services: PlaceService[] };
      setServices(data.services.filter((s) => s.isActive));
    } catch (error) {
      console.error("Error loading services:", error);
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm("Are you sure you want to remove this service?")) {
      return;
    }

    try {
      const response = await fetch(`/api/business/places/${placeId}/services/${serviceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "Failed to delete service");
        return;
      }

      toast.success("Service removed successfully");
      await loadServices();
    } catch (error) {
      console.error("Error deleting service:", error);
      toast.error("An unexpected error occurred");
    }
  };

  const handleServiceAdded = () => {
    setShowAddModal(false);
    void loadServices();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading services...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Services</CardTitle>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>No services added yet.</p>
              <p className="text-sm">Click "Add Service" to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-start justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{service.serviceType.nameRu}</h3>
                      <Badge variant="outline">{service.serviceType.category.nameRu}</Badge>
                      {service.isSpecialOffer && (
                        <Badge variant="secondary">{service.specialLabel ?? "Special Offer"}</Badge>
                      )}
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {service.priceFrom !== null && (
                        <div>
                          <span className="font-medium">Price:</span>{" "}
                          {service.priceFrom === service.priceTo
                            ? `${service.priceFrom} ${service.currency}`
                            : `${service.priceFrom} - ${service.priceTo ?? "?"} ${service.currency}`}
                        </div>
                      )}
                      {service.durationMinutes && (
                        <div>
                          <span className="font-medium">Duration:</span> {service.durationMinutes} min
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(service.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showAddModal && (
        <AddServiceModal
          placeId={placeId}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleServiceAdded}
        />
      )}
    </>
  );
}

