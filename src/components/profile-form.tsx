"use client";

import { useMemo, useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { ProfileInput } from "@/lib/validations/profile";
import { profileSchema } from "@/lib/validations/profile";
import type { Gender } from "@prisma/client";

interface Profile {
  id: string;
  fullName: string | null;
  birthDate: Date | null;
  city: string | null;
  phone: string | null;
  locale: string | null;
  timezone: string | null;
  gender: Gender | null;
}

interface ProfileFormProps {
  initialProfile: Profile | null;
}

export function ProfileForm({ initialProfile }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: useMemo(
      () => ({
        fullName: initialProfile?.fullName ?? "",
        birthDate: initialProfile?.birthDate
          ? new Date(initialProfile.birthDate).toISOString().split("T")[0]
          : "",
        city: initialProfile?.city ?? "",
        phone: initialProfile?.phone ?? "",
        locale: initialProfile?.locale ?? "",
        timezone: initialProfile?.timezone ?? "",
        gender: initialProfile?.gender ?? "UNKNOWN",
      }),
      [initialProfile]
    ),
  });

  useEffect(() => {
    if (initialProfile) {
      form.reset({
        fullName: initialProfile.fullName ?? "",
        birthDate: initialProfile.birthDate
          ? new Date(initialProfile.birthDate).toISOString().split("T")[0]
          : "",
        city: initialProfile.city ?? "",
        phone: initialProfile.phone ?? "",
        locale: initialProfile.locale ?? "",
        timezone: initialProfile.timezone ?? "",
        gender: initialProfile.gender ?? "UNKNOWN",
      });
    }
  }, [initialProfile, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsLoading(true);
    setSaved(false);

    try {
      // Convert date string to ISO string for API
      const payload = {
        ...values,
        birthDate: values.birthDate ? new Date(values.birthDate).toISOString() : undefined,
      };

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        alert(data?.error ?? "Failed to save profile");
        return;
      }

      setSaved(true);
      setTimeout(() => { setSaved(false); }, 3000);
    } catch (err) {
      console.error("Profile submission error", err);
      alert("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Birth Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="New York" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+1234567890" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="locale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Locale</FormLabel>
                  <FormControl>
                    <Input placeholder="en-US" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <Input placeholder="America/New_York" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="UNKNOWN">Unknown</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save"}
              </Button>
              {saved && <span className="text-sm text-green-600">Saved</span>}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

