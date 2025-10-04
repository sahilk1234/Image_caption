"use client";

import * as React from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadDropzone } from "@/components/UploadDropzone";
import { captionImage } from "@/lib/api";
import Image from "next/image";
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
      <PageHeader title="Caption an image" subtitle="Anonymous use works. Sign in to save your history." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Upload</CardTitle></CardHeader>
          <CardContent>
            <UploadDropzone onFile={onFile} />
            {preview && (
              <div className="mt-4 overflow-hidden rounded-xl border">
                <Image src={preview} alt="preview" width={800} height={800} className="h-auto w-full" />
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Button disabled={!file || busy} onClick={onCaption}>
                {busy ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Captioning…</>) : "Get caption"}
              </Button>
              <Button variant="secondary" onClick={() => { setFile(null); setPreview(""); setResult(null); setError(""); }}>
                Reset
              </Button>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Result</CardTitle></CardHeader>
          <CardContent>
            {result ? (
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
      </div>
    </AppShell>
  );
}
