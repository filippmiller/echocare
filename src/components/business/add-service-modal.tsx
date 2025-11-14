"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

interface ServiceCategory {
  id: string;
  code: string;
  nameRu: string;
  nameEn: string;
}

interface ServiceType {
  id: string;
  code: string;
  nameRu: string;
  nameEn: string;
  defaultDurationMinutes: number | null;
  pricingUnit: string;
  category: ServiceCategory;
}

interface AddServiceModalProps {
  placeId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddServiceModal({ placeId, onClose, onSuccess }: AddServiceModalProps) {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string>("");
  const [priceFrom, setPriceFrom] = useState<string>("");
  const [priceTo, setPriceTo] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<string>("");
  const [isSpecialOffer, setIsSpecialOffer] = useState(false);
  const [specialLabel, setSpecialLabel] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch("/api/services/categories");
        if (!response.ok) {
          throw new Error("Failed to load categories");
        }
        const data = (await response.json()) as { categories: ServiceCategory[] };
        setCategories(data.categories);
      } catch (error) {
        console.error("Error loading categories:", error);
        toast.error("Failed to load categories");
      } finally {
        setLoadingCategories(false);
      }
    };
    void loadCategories();
  }, []);

  useEffect(() => {
    if (!selectedCategoryId) {
      setServiceTypes([]);
      return;
    }

    const loadServiceTypes = async () => {
      try {
        const response = await fetch(`/api/services/types?categoryId=${selectedCategoryId}`);
        if (!response.ok) {
          throw new Error("Failed to load service types");
        }
        const data = (await response.json()) as { serviceTypes: ServiceType[] };
        setServiceTypes(data.serviceTypes);
      } catch (error) {
        console.error("Error loading service types:", error);
        toast.error("Failed to load service types");
      }
    };
    void loadServiceTypes();
  }, [selectedCategoryId]);

  const selectedServiceType = serviceTypes.find((st) => st.id === selectedServiceTypeId);

  useEffect(() => {
    if (selectedServiceType?.defaultDurationMinutes) {
      setDurationMinutes(selectedServiceType.defaultDurationMinutes.toString());
    }
  }, [selectedServiceType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        serviceTypeId: selectedServiceTypeId,
        priceFrom: priceFrom ? parseFloat(priceFrom) : null,
        priceTo: priceTo ? parseFloat(priceTo) : null,
        currency: "RUB",
        durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
        isActive: true,
        isSpecialOffer,
        specialLabel: specialLabel || null,
        notes: null,
      };

      const response = await fetch(`/api/business/places/${placeId}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "Failed to add service");
        return;
      }

      toast.success("Service added successfully");
      onSuccess();
    } catch (error) {
      console.error("Error adding service:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Add Service</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={selectedCategoryId}
                onValueChange={(value) => {
                  setSelectedCategoryId(value);
                  setSelectedServiceTypeId("");
                }}
                disabled={loadingCategories}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.nameRu}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCategoryId && (
              <div>
                <Label htmlFor="serviceType">Service</Label>
                <Select
                  value={selectedServiceTypeId}
                  onValueChange={setSelectedServiceTypeId}
                >
                  <SelectTrigger id="serviceType">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((serviceType) => (
                      <SelectItem key={serviceType.id} value={serviceType.id}>
                        {serviceType.nameRu}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedServiceTypeId && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priceFrom">Price From</Label>
                    <Input
                      id="priceFrom"
                      type="number"
                      step="0.01"
                      value={priceFrom}
                      onChange={(e) => setPriceFrom(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priceTo">Price To</Label>
                    <Input
                      id="priceTo"
                      type="number"
                      step="0.01"
                      value={priceTo}
                      onChange={(e) => setPriceTo(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="durationMinutes">Duration (minutes)</Label>
                  <Input
                    id="durationMinutes"
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    placeholder="60"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isSpecialOffer"
                    checked={isSpecialOffer}
                    onChange={(e) => setIsSpecialOffer(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="isSpecialOffer">Special Offer</Label>
                </div>

                {isSpecialOffer && (
                  <div>
                    <Label htmlFor="specialLabel">Special Label</Label>
                    <Input
                      id="specialLabel"
                      value={specialLabel}
                      onChange={(e) => setSpecialLabel(e.target.value)}
                      placeholder="-25% с 14 до 17"
                    />
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !selectedServiceTypeId}>
                {loading ? "Adding..." : "Add Service"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

