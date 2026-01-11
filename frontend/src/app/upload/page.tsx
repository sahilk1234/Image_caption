"use client";

import * as React from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadDropzone } from "@/components/UploadDropzone";
import { captionImage } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Page() {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string>("");
  const [result, setResult] = React.useState<any>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string>("");

  function onFile(f: File) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError("");
  }

  async function onCaption() {
    if (!file) return;
    setBusy(true);
    setError("");
    setResult(null);
    toast.info("Uploading image…");
    try {
      const json = await captionImage(file);
      setResult(json);
      toast.success("Caption ready!");
    } catch (e: any) {
      const msg = e?.message || "Failed to caption";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Caption an image"
        subtitle="Upload a photo and receive a crisp caption in seconds."
        actions={
          <Button asChild variant="outline">
            <Link href="/history">View history</Link>
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/60 bg-card/70 shadow-sm">
          <CardHeader>
            <CardTitle>Upload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <UploadDropzone onFile={onFile} />
            {preview && (
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60">
                <Image src={preview} alt="preview" width={800} height={800} className="h-auto w-full" />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button disabled={!file || busy} onClick={onCaption}>
                {busy ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Captioning…</>) : "Get caption"}
              </Button>
              <Button variant="secondary" onClick={() => { setFile(null); setPreview(""); setResult(null); setError(""); }}>
                Reset
              </Button>
            </div>
            {busy && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing image and generating caption…
              </div>
            )}
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card className="border-border/60 bg-card/70 shadow-sm">
            <CardHeader><CardTitle>Result</CardTitle></CardHeader>
            <CardContent>
              {busy ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating caption…
                </div>
              ) : result ? (
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Caption:</span> {result.caption}</div>
                  <div className="text-muted-foreground">
                    Model: {result.model_version} • Latency: {result.latency_ms}ms
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Your caption will appear here.</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/60">
            <CardHeader>
              <CardTitle className="text-sm">Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Use clear, well-lit images for the best results.</p>
              <p>Guest sessions are temporary. Sign in to keep history.</p>
              <p>Captions are generated with a compact Transformer model.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
