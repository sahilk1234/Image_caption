"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { Input } from "@/components/ui/input";

export function UploadDropzone({ onFile }: { onFile: (f: File) => void }) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }
  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="group relative flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-dashed border-border/70 p-10 text-center transition hover:border-primary/50 hover:bg-card/60"
    >
      <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-primary/15 blur-2xl" />
        <div className="absolute -bottom-16 right-0 h-40 w-40 rounded-full bg-[oklch(0.88_0.08_90/0.45)] blur-2xl" />
      </div>
      <div className="relative flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Upload className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium">Drop an image here</p>
        <p className="text-xs text-muted-foreground">
          Or click to browse PNG, JPG, or WEBP files.
        </p>
      </div>
      <Input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </div>
  );
}
