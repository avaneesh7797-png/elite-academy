"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Category = { id: string; name: string; slug: string };

export default function SellPage() {
  const router = useRouter();
  const { status } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/sell");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  }, []);

  const onUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setError(d.error ?? "Upload failed");
      return;
    }
    const d = await r.json();
    setImageUrl(d.url);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!imageUrl) {
      setError("Please upload an image.");
      return;
    }
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const buyNowRaw = String(fd.get("buyNowPrice") || "").trim();
    const payload = {
      title: String(fd.get("title") || "").trim(),
      description: String(fd.get("description") || "").trim(),
      categoryId: String(fd.get("categoryId") || ""),
      condition: String(fd.get("condition") || "USED"),
      startPrice: Number(fd.get("startPrice")),
      buyNowPrice: buyNowRaw ? Number(buyNowRaw) : null,
      durationHours: Number(fd.get("durationHours")),
      imageUrl,
    };

    const r = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setError(d.error ?? "Failed to create listing");
      return;
    }
    const d = await r.json();
    router.push(`/listing/${d.listing.id}`);
  };

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create a listing</CardTitle>
          <CardDescription>Auctions run for the duration you choose. Set a buy-it-now price to let buyers skip bidding.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="image">Photo</Label>
              <Input
                id="image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                }}
                disabled={uploading}
              />
              {imageUrl && (
                <div className="relative mt-2 aspect-video w-full max-w-sm overflow-hidden rounded-md border">
                  <Image src={imageUrl} alt="Preview" fill className="object-cover" sizes="384px" />
                </div>
              )}
              {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required minLength={3} maxLength={120} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" required minLength={10} rows={5} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <select
                  id="categoryId"
                  name="categoryId"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <select
                  id="condition"
                  name="condition"
                  defaultValue="USED"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="NEW">New</option>
                  <option value="USED">Used</option>
                  <option value="REFURBISHED">Refurbished</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="startPrice">Starting price ($)</Label>
                <Input id="startPrice" name="startPrice" type="number" step="0.01" min="0.01" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyNowPrice">Buy-now ($, optional)</Label>
                <Input id="buyNowPrice" name="buyNowPrice" type="number" step="0.01" min="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationHours">Duration</Label>
                <select
                  id="durationHours"
                  name="durationHours"
                  defaultValue="72"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="1">1 hour</option>
                  <option value="6">6 hours</option>
                  <option value="24">1 day</option>
                  <option value="72">3 days</option>
                  <option value="168">7 days</option>
                  <option value="240">10 days</option>
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting || uploading}>
              {submitting ? "Creating..." : "List item"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
