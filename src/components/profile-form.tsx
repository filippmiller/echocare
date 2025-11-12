"use client";

import { useMemo, useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { ProfileInput } from "@/lib/validations/profile";
import { profileSchema } from "@/lib/validations/profile";
import type { Gender } from "@prisma/client";
import { predictGenderFromName } from "@/lib/genderPrediction";
import { searchCitiesFallback } from "@/lib/citySearch";

interface Profile {
  id: string;
  fullName: string | null;
  birthDate: Date | null;
  city: string | null;
  phone: string | null;
  locale: string | null;
  avatarUrl: string | null;
  gender: Gender | null;
}

interface ProfileFormProps {
  initialProfile: Profile | null;
  userName: string | null; // User.name from database
}

export function ProfileForm({ initialProfile, userName }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarDisplayUrl, setAvatarDisplayUrl] = useState<string | null>(null); // URL для отображения (preview)
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<Array<{ name: string; country: string; fullName: string }>>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  // Use User.name if available, otherwise use Profile.fullName
  const displayName = userName ?? initialProfile?.fullName ?? "";
  
  // Predict gender from name if not set
  const predictedGender = useMemo(() => {
    if (initialProfile?.gender && initialProfile.gender !== "UNKNOWN") {
      return initialProfile.gender;
    }
    return predictGenderFromName(displayName);
  }, [displayName, initialProfile?.gender]);

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: useMemo(
      () => ({
        fullName: displayName,
        birthDate: initialProfile?.birthDate
          ? new Date(initialProfile.birthDate).toISOString().split("T")[0]
          : "",
        city: initialProfile?.city ?? "",
        phone: initialProfile?.phone ?? "",
        locale: (initialProfile?.locale === "en" || initialProfile?.locale === "ru") ? initialProfile.locale : undefined,
        avatarUrl: initialProfile?.avatarUrl ?? "",
        gender: predictedGender,
      }),
      [initialProfile, displayName, predictedGender]
    ),
  });

  // Load avatar display URL from path when component mounts or profile changes
  useEffect(() => {
    const loadDisplayUrl = async () => {
      if (initialProfile?.avatarUrl) {
        // If it's already a URL, use it directly
        if (initialProfile.avatarUrl.startsWith("http")) {
          setAvatarDisplayUrl(initialProfile.avatarUrl);
        } else {
          // Otherwise, fetch signed URL from API
          try {
            const response = await fetch(`/api/profile/avatar/url?path=${encodeURIComponent(initialProfile.avatarUrl)}`);
            if (response.ok) {
              const data = (await response.json()) as { avatarUrl: string };
              setAvatarDisplayUrl(data.avatarUrl);
            } else {
              console.error("Failed to get avatar URL from API");
              setAvatarDisplayUrl(null);
            }
          } catch (error) {
            console.error("Error fetching avatar URL:", error);
            setAvatarDisplayUrl(null);
          }
        }
      } else {
        setAvatarDisplayUrl(null);
      }
    };
    void loadDisplayUrl();
  }, [initialProfile?.avatarUrl]);

  useEffect(() => {
    const displayName = userName ?? initialProfile?.fullName ?? "";
    form.reset({
      fullName: displayName,
      birthDate: initialProfile?.birthDate
        ? new Date(initialProfile.birthDate).toISOString().split("T")[0]
        : "",
      city: initialProfile?.city ?? "",
      phone: initialProfile?.phone ?? "",
      locale: (initialProfile?.locale === "en" || initialProfile?.locale === "ru") ? initialProfile.locale : undefined,
      avatarUrl: initialProfile?.avatarUrl ?? "", // Store path, not URL
      gender: predictedGender,
    });
  }, [initialProfile, userName, form, predictedGender]);

  const handleCityChange = (value: string) => {
    form.setValue("city", value);
    if (value.length >= 2) {
      const suggestions = searchCitiesFallback(value);
      setCitySuggestions(suggestions);
      setShowCitySuggestions(suggestions.length > 0);
    } else {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
    }
  };

  const handleCitySelect = (fullName: string) => {
    form.setValue("city", fullName);
    setShowCitySuggestions(false);
    setCitySuggestions([]);
  };

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "Failed to upload avatar");
        return;
      }

      const result = (await response.json()) as { avatarUrl: string; path: string };
      
      // Для instant preview в форме используем signed URL
      setAvatarDisplayUrl(result.avatarUrl);
      
      // В ФОРМЕ/БД ХРАНИМ ТОЛЬКО ПУТЬ (а не URL)
      form.setValue("avatarUrl", result.path);
      
      toast.success("Avatar updated successfully");
    } catch (err) {
      console.error("Avatar upload error", err);
      toast.error("An unexpected error occurred while uploading avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsLoading(true);
    setSaved(false);

    try {
      // Convert date string to ISO string for API
      const payload = {
        ...values,
        birthDate: values.birthDate ? new Date(values.birthDate).toISOString() : undefined,
        // Don't send fullName if it matches userName (already in system)
        fullName: values.fullName && values.fullName !== userName ? values.fullName : undefined,
      };

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "Failed to save profile");
        return;
      }

      toast.success("Profile saved successfully");
      setSaved(true);
      setTimeout(() => { setSaved(false); }, 3000);
    } catch (err) {
      console.error("Profile submission error", err);
      toast.error("An unexpected error occurred");
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
                    <div className="flex items-center gap-2">
                      <Input placeholder="John Doe" {...field} value={field.value ?? ""} readOnly={!!userName} />
                      {userName && (
                        <span className="text-xs text-muted-foreground">(from registration)</span>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="avatarUrl"
              render={() => (
                <FormItem>
                  <FormLabel>Avatar</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-4">
                      {avatarDisplayUrl ? (
                        <img
                          src={avatarDisplayUrl}
                          alt="Avatar"
                          className="h-20 w-20 rounded-full object-cover border-2 border-border"
                          onError={(e) => {
                            console.error("Avatar image failed to load:", avatarDisplayUrl);
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-full border-2 border-border bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">Avatar</span>
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              void handleAvatarUpload(file);
                            }
                          }}
                          disabled={uploadingAvatar}
                          className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50"
                        />
                        {uploadingAvatar && <span className="text-xs text-muted-foreground">Uploading...</span>}
                      </div>
                    </div>
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
                    <div className="relative">
                      <Input
                        placeholder="New York"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e);
                          handleCityChange(e.target.value);
                        }}
                        onFocus={() => {
                          if (citySuggestions.length > 0) {
                            setShowCitySuggestions(true);
                          }
                        }}
                        onBlur={() => {
                          // Delay hiding suggestions to allow click
                          setTimeout(() => setShowCitySuggestions(false), 200);
                        }}
                      />
                      {showCitySuggestions && citySuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                          {citySuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleCitySelect(suggestion.fullName);
                              }}
                            >
                              <div className="font-medium">{suggestion.name}</div>
                              <div className="text-xs text-muted-foreground">{suggestion.country}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
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

