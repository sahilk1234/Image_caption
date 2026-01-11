"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  History,
  LogIn,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { type AuthUser } from "@/lib/auth";
import { useAuth } from "@/lib/useAuth";

function initialsOf(u?: AuthUser | null) {
  const name = (u?.name || u?.email || "G").trim();
  const parts = name.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "G";
}

function ThemeToggle() {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    const root = document.documentElement;
    dark ? root.classList.add("dark") : root.classList.remove("dark");
  }, [dark]);
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setDark((v) => !v)}
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/upload", label: "Caption", icon: Upload },
  { href: "/history", label: "History", icon: History },
];

function NavItem({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon: any;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition",
        active
          ? "bg-card/80 text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-card/60"
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}

export function TopNav() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const label =
    user?.name?.trim() ||
    user?.email?.trim() ||
    (user?.guest ? "Guest" : "Account");

  const onLogout = () => {
    logout();
    router.push("/auth");
  };

  return (
    <div className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-sm">
            IC
          </div>
          <span className="hidden text-sm font-medium text-muted-foreground sm:block">
            Image Captioning
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Separator orientation="vertical" className="mx-2 h-6" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">
                    {initialsOf(user)}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[120px] truncate">{label}</span>
                {!user || user.guest ? (
                  <LogIn className="ml-1 h-4 w-4" />
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="space-y-0.5">
                <div className="text-sm font-medium leading-none">
                  {user?.name || user?.email || "Guest"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {user?.guest
                    ? "Guest session (24h)"
                    : user?.email || "Signed in"}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {(!user || user.guest) && (
                <DropdownMenuItem asChild>
                  <Link href="/auth">Sign in</Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={onLogout}>
                {user?.guest ? "Reset guest session" : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export function SideNav() {
  const { isGuest } = useAuth();

  return (
    <aside className="hidden h-[calc(100dvh-64px)] w-60 shrink-0 border-r border-border/60 bg-card/40 p-3 md:block">
      <div className="space-y-1">
        {NAV.map((n) => (
          <NavItem key={n.href} href={n.href} label={n.label} Icon={n.icon} />
        ))}
      </div>

      {isGuest ? (
        <div className="mt-6 rounded-xl border bg-card p-3 text-xs text-muted-foreground">
          Use guest mode without signup.{" "}
          <strong>Sign in to save history.</strong>
        </div>
      ) : null}
    </aside>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh w-full">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-32 h-80 w-80 rounded-full bg-primary/20 blur-3xl animate-float" />
        <div className="absolute top-10 right-[-10%] h-96 w-96 rounded-full bg-[oklch(0.9_0.07_90/0.45)] blur-3xl animate-float" />
        <div className="absolute bottom-[-20%] left-[20%] h-72 w-72 rounded-full bg-[oklch(0.82_0.08_190/0.35)] blur-3xl animate-float" />
      </div>
      <TopNav />
      <div className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
        <SideNav />
        <main className="min-h-[calc(100dvh-64px)] p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-up">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions}
    </div>
  );
}
