"use client";

import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, ShieldCheck, Clock, ImageIcon } from "lucide-react";

export default function Page() {
  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-3xl border bg-card/80 p-8 shadow-sm animate-fade-up">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-[oklch(0.9_0.07_90/0.35)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Visual Storytelling
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Turn images into captions with editorial polish.
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground md:text-base">
              Upload a photo, get a rich caption, and keep a tidy history. Guest sessions
              work out of the box; signing in keeps everything organized.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/upload">Caption an image</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/history">View history</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Crisp outputs in seconds
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Guest-safe by default
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                24-hour guest history
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <Card className="border-border/60 bg-background/70 shadow-sm">
              <CardHeader className="space-y-2">
                <CardTitle className="text-sm text-muted-foreground">Latest output</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Image uploaded</p>
                    <p className="text-xs text-muted-foreground">2024-01-12 • 238ms</p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  “A golden retriever waits beside a sunlit window, head tilted in
                  anticipation.”
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/70">
              <CardHeader>
                <CardTitle className="text-sm">What’s new</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Guest tokens are auto-provisioned on first upload.</li>
                  <li>History cards now display image previews instantly.</li>
                  <li>Optimized inference path for CPU-only hosts.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
