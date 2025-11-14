"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Upload, Check } from "lucide-react";

interface Photo {
  id: string;
  url: string;
  path: string;
  width?: number | null;
  height?: number | null;
  createdAt: string;
}

interface PhotoGalleryProps {
  currentAvatarPath?: string | null;
  onAvatarSelect?: (photoId: string) => void;
}

export function PhotoGallery({ currentAvatarPath, onAvatarSelect }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  const loadPhotos = async () => {
    try {
      const response = await fetch("/api/profile/photos");
      if (!response.ok) {
        throw new Error("Failed to load photos");
      }
      const data = (await response.json()) as { photos: Photo[] };
      setPhotos(data.photos);
      
      // Find currently selected avatar
      if (currentAvatarPath) {
        const currentPhoto = data.photos.find((p) => p.path === currentAvatarPath);
        if (currentPhoto) {
          setSelectedPhotoId(currentPhoto.id);
        }
      }
    } catch (error) {
      console.error("Error loading photos:", error);
      toast.error("Failed to load photos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPhotos();
  }, [currentAvatarPath]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/profile/photos", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "Failed to upload photo");
        return;
      }

      const newPhoto = (await response.json()) as Photo;
      setPhotos((prev) => [newPhoto, ...prev]);
      toast.success("Photo uploaded successfully");
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("An unexpected error occurred while uploading photo");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) {
      return;
    }

    try {
      const response = await fetch(`/api/profile/photos/${photoId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "Failed to delete photo");
        return;
      }

      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      if (selectedPhotoId === photoId) {
        setSelectedPhotoId(null);
      }
      toast.success("Photo deleted successfully");
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error("An unexpected error occurred while deleting photo");
    }
  };

  const handleSelectAvatar = async (photoId: string) => {
    try {
      const response = await fetch("/api/profile/avatar/select", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "Failed to select avatar");
        return;
      }

      setSelectedPhotoId(photoId);
      toast.success("Avatar updated successfully");
      onAvatarSelect?.(photoId);
    } catch (error) {
      console.error("Error selecting avatar:", error);
      toast.error("An unexpected error occurred while selecting avatar");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading photos...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Photo Gallery</h3>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void handleUpload(file);
                }
                e.target.value = ""; // Reset input
              }}
              disabled={uploading}
              className="hidden"
              id="photo-upload"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("photo-upload")?.click()}
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Uploading..." : "Upload Photo"}
            </Button>
          </div>
        </div>

        {photos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No photos yet. Upload your first photo to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-lg border-2 border-border bg-muted"
              >
                <img
                  src={photo.url}
                  alt="Photo"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    console.error("Photo failed to load:", photo.url);
                    e.currentTarget.style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex h-full items-center justify-center gap-2">
                    {selectedPhotoId === photo.id ? (
                      <div className="flex items-center gap-2 rounded bg-green-600 px-3 py-1.5 text-sm text-white">
                        <Check className="h-4 w-4" />
                        Avatar
                      </div>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => void handleSelectAvatar(photo.id)}
                          className="h-8"
                        >
                          Use as Avatar
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => void handleDelete(photo.id)}
                          className="h-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


