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
      onDragOver={e => e.preventDefault()}
      onDrop={onDrop}
      className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center hover:bg-muted/30"
    >
      <Upload className="h-6 w-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Drop an image here or click to upload</p>
      <Input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </div>
  );
}
