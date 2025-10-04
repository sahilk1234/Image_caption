"use client";

import * as React from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchHistory } from "@/lib/api";
import { toast } from "sonner";

export default function Page() {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  async function load() {
    try {
      setError("");
      setLoading(true);
      const data = await fetchHistory();
      setItems(data || []);
      if ((data || []).length === 0) toast.info("No history yet.");
    } catch (e: any) {
      const msg = e?.message || "Failed to load history";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => { load(); }, []);

  return (
    <AppShell>
      <PageHeader title="History" subtitle="Your recent captions."
        actions={<Button onClick={load} variant="outline">Refresh</Button>} />
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {!loading && items.length === 0 && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No captions yet.
            </CardContent>
          </Card>
        )}

        {items.map((it: any) => (
          <Card key={it.id} className="overflow-hidden">
            {it.image_url && (
              <img
                src={it.image_url}
                alt={it.image_filename || `Image #${it.image_id}`}
                className="w-full h-40 object-cover"
                loading="lazy"
              />
            )}
            <CardHeader>
              <CardTitle className="text-sm truncate">
                {it.image_filename || `Image #${it.image_id}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{it.caption}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {it.created_at ? new Date(it.created_at).toLocaleString() : ""}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
