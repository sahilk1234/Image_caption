"use client";

import * as React from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchHistory } from "@/lib/api";
import { HistoryItem } from "@/lib/types";
import { toast } from "sonner";
import { ImageOff, Loader2 } from "lucide-react";

export default function Page() {
  const [items, setItems] = React.useState<HistoryItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>("");
  const [broken, setBroken] = React.useState<Record<number, boolean>>({});

  async function load(): Promise<void> {
    try {
      setError("");
      setLoading(true);
      const data = await fetchHistory();
      setItems(data || []);
      if ((data || []).length === 0) toast.info("No history yet.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load history";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="History"
        subtitle="Your recent captions."
        actions={
          <Button onClick={() => void load()} variant="outline" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading…
              </>
            ) : (
              "Refresh"
            )}
          </Button>
        }
      />
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-in">
        {loading && (
          <Card className="col-span-full border-border/60 bg-card/70 shadow-sm">
            <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading history…
            </CardContent>
          </Card>
        )}
        {!loading && items.length === 0 && (
          <Card className="border-border/60 bg-card/70 shadow-sm">
            <CardContent className="p-6 text-sm text-muted-foreground">
              No captions yet.
            </CardContent>
          </Card>
        )}

        {items.map((it: any) => (
          <Card key={it.id} className="overflow-hidden border-border/60 bg-card/70 shadow-sm">
            {it.image_url && !broken[it.id] ? (
              <div className="relative">
                <img
                  src={it.image_url}
                  alt={it.image_filename || `Image #${it.image_id}`}
                  className="h-40 w-full object-cover"
                  loading="lazy"
                  onError={() => setBroken((prev) => ({ ...prev, [it.id]: true }))}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent" />
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center bg-muted/40 text-muted-foreground">
                <div className="flex items-center gap-2 text-xs">
                  <ImageOff className="h-4 w-4" />
                  Preview unavailable
                </div>
              </div>
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
