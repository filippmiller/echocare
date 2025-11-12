"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Save } from "lucide-react";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  name: string;
  provider: string;
  maskedValue: string;
  isActive: boolean;
}

interface ApiKeysFormProps {
  initialKey?: ApiKey | null;
  onClose: () => void;
  onSuccess: () => void;
}

const PROVIDERS = ["openai", "anthropic", "google", "azure"];

export function ApiKeysForm({ initialKey, onClose, onSuccess }: ApiKeysFormProps) {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("openai");
  const [keyValue, setKeyValue] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialKey) {
      setName(initialKey.name);
      setProvider(initialKey.provider);
      setIsActive(initialKey.isActive);
      // Don't pre-fill keyValue for security
    }
  }, [initialKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (initialKey) {
        // Update existing key
        const updateData: { name?: string; isActive?: boolean } = {};
        if (name !== initialKey.name) {
          updateData.name = name;
        }
        if (isActive !== initialKey.isActive) {
          updateData.isActive = isActive;
        }

        // Only update keyValue if provided
        if (keyValue.trim()) {
          // For security, we'd need a separate endpoint to update the key value
          // For now, we'll just update name and isActive
          toast.warning("To change the key value, please delete and recreate the key");
        }

        const response = await fetch(`/api/admin/api-keys/${initialKey.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          throw new Error("Failed to update API key");
        }

        toast.success("API key updated");
      } else {
        // Create new key
        if (!keyValue.trim()) {
          toast.error("Key value is required");
          setIsLoading(false);
          return;
        }

        const response = await fetch("/api/admin/api-keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            provider,
            keyValue: keyValue.trim(),
          }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "Failed to create API key");
        }

        toast.success("API key created");
      }

      onSuccess();
    } catch (err) {
      console.error("Submit error", err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{initialKey ? "Edit API Key" : "Add New API Key"}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., OpenAI Production"
                required
              />
            </div>

            <div>
              <Label htmlFor="provider">Provider</Label>
              <select
                id="provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!!initialKey} // Don't allow changing provider for existing keys
              >
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {!initialKey && (
              <div>
                <Label htmlFor="keyValue">API Key Value</Label>
                <Input
                  id="keyValue"
                  type="password"
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  placeholder="sk-..."
                  required={!initialKey}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The key will be encrypted before storage.
                </p>
              </div>
            )}

            {initialKey && (
              <div>
                <Label htmlFor="isActive">Status</Label>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    Active
                  </Label>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Saving..." : initialKey ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

