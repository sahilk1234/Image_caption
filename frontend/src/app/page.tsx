"use client";

import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Page() {
  return (
    <AppShell>
      <PageHeader title="Overview" subtitle="Start captioning your images." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Get Started</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Upload an image and receive a caption. Use guest mode freely; sign in to keep history.
            </p>
            <div className="mt-3">
              <Button asChild><Link href="/upload">Caption an image</Link></Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>What’s new</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Guest tokens are auto-provisioned</li>
              <li>History page lists recent captions</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
