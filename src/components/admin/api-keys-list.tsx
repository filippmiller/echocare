"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, Edit, Trash2, TestTube, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { ApiKeysForm } from "./api-keys-form";

interface ApiKey {
  id: string;
  name: string;
  provider: string;
  maskedValue: string;
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export function ApiKeysList() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  const fetchKeys = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/api-keys");
      if (!response.ok) {
        throw new Error("Failed to fetch API keys");
      }

      const data = (await response.json()) as { keys: ApiKey[] };
      setKeys(data.keys);
    } catch (err) {
      console.error("Fetch error", err);
      toast.error("Failed to load API keys");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchKeys();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/api-keys/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete API key");
      }

      toast.success("API key deleted");
      void fetchKeys();
    } catch (err) {
      console.error("Delete error", err);
      toast.error("Failed to delete API key");
    }
  };

  const handleToggleActive = async (key: ApiKey) => {
    try {
      const response = await fetch(`/api/admin/api-keys/${key.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !key.isActive }),
      });

      if (!response.ok) {
        throw new Error("Failed to update API key");
      }

      toast.success(`API key ${!key.isActive ? "activated" : "deactivated"}`);
      void fetchKeys();
    } catch (err) {
      console.error("Toggle error", err);
      toast.error("Failed to update API key");
    }
  };

  const handleTest = async (id: string) => {
    try {
      toast.info("Testing API key...");
      const response = await fetch(`/api/admin/api-keys/${id}/test`, {
        method: "POST",
      });

      const data = (await response.json()) as { success: boolean; message: string };

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }

      void fetchKeys(); // Refresh to update lastUsedAt
    } catch (err) {
      console.error("Test error", err);
      toast.error("Failed to test API key");
    }
  };

  const toggleReveal = (id: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading API keys...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>API Keys</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => void fetchKeys()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Key
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No API keys found. Click "Add New Key" to create one.
            </div>
          ) : (
            <div className="space-y-4">
              {keys.map((key) => (
                <div key={key.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{key.name}</h3>
                        <Badge variant={key.isActive ? "default" : "secondary"}>
                          {key.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">{key.provider}</Badge>
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <span>Key:</span>
                          <code className="bg-muted px-2 py-1 rounded text-xs">
                            {revealedKeys.has(key.id) ? key.maskedValue : "••••••••"}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleReveal(key.id)}
                          >
                            {revealedKeys.has(key.id) ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        {key.lastUsedAt && (
                          <div>
                            Last used: {new Date(key.lastUsedAt).toLocaleString()}
                          </div>
                        )}
                        <div>Created: {new Date(key.createdAt).toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(key.id)}
                        disabled={!key.isActive}
                      >
                        <TestTube className="h-4 w-4 mr-2" />
                        Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingKey(key);
                          setShowForm(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(key)}
                      >
                        {key.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(key.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <ApiKeysForm
          key={editingKey?.id ?? "new"}
          initialKey={editingKey}
          onClose={() => {
            setShowForm(false);
            setEditingKey(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingKey(null);
            void fetchKeys();
          }}
        />
      )}
    </>
  );
}

