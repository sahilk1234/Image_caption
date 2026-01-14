// app/auth/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { setAuth, getToken, getUser, isGuest } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getApiBase } from "@/lib/apiBase";

type TabKey = "login" | "register";

export default function Page() {
  const router = useRouter();
  const [tab, setTab] = React.useState<TabKey>("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [msgLogin, setMsgLogin] = React.useState("");
  const [msgReg, setMsgReg] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const API = getApiBase();
  const MIN_PASS = 6;

  React.useEffect(() => {
    const t = getToken();
    const u = getUser();
    if (t && u && !isGuest(u)) {
      router.replace("/");
    }
  }, [router]);

  const parseJSON = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      return {};
    }
  };

  const passTooShort = (n = MIN_PASS) =>
    `Password must be at least ${n} characters`;

  async function login() {
    setMsgLogin("");
    if (!email) return toast.error("Email is required");
    if (!password) return toast.error("Password is required");
    if (password.length < MIN_PASS) return toast.error(passTooShort());

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const json = await parseJSON(res);

      if (res.ok && json?.access) {
        setAuth(json.access, json.user);
        toast.success("Signed in");
        router.replace("/");
      } else {
        const detail =
          json?.detail ||
          (res.status === 401
            ? "Invalid email or password"
            : `Login failed (HTTP ${res.status})`);
        setMsgLogin(detail);
        toast.error(detail);
      }
    } catch {
      setMsgLogin("Login failed");
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function register() {
    setMsgReg("");
    if (!email) return toast.error("Email is required");
    if (!password) return toast.error("Password is required");
    if (password.length < MIN_PASS) return toast.error(passTooShort());

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // keep cookie for guest merge
        body: JSON.stringify({ email, password, name }),
      });
      const json = await parseJSON(res);

      if (res.ok && json?.access) {
        setAuth(json.access, json.user);
        toast.success("Registered & signed in");
        router.replace("/");
      } else {
        let detail = json?.detail as string | undefined;
        if (!detail) {
          if (res.status === 409) detail = "Email already registered";
          else if (res.status === 422)
            detail = "Invalid input (check email & password)";
          else detail = `Register failed (HTTP ${res.status})`;
        }
        setMsgReg(detail);
        toast.error(detail);
      }
    } catch {
      setMsgReg("Register failed");
      toast.error("Register failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Sign in"
        subtitle="Or continue as guest; a 24-hour guest session is created automatically on first use."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_0.7fr]">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as TabKey)}
          className="max-w-2xl"
        >
          <TabsList className="mb-4">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          {/* LOGIN */}
          <TabsContent value="login">
            <Card className="border-border/60 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle>Login</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm">Email</label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="me@example.com"
                    type="email"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="text-sm">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="******"
                    minLength={MIN_PASS}
                    autoComplete="current-password"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Minimum {MIN_PASS} characters
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={login} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in…
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </div>
                {msgLogin && (
                  <p className="text-sm text-muted-foreground">{msgLogin}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* REGISTER */}
          <TabsContent value="register">
            <Card className="border-border/60 bg-card/70 shadow-sm">
              <CardHeader>
                <CardTitle>Register</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm">Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="text-sm">Email</label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="me@example.com"
                    type="email"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="text-sm">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="******"
                    minLength={MIN_PASS}
                    autoComplete="new-password"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Minimum {MIN_PASS} characters
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={register}
                    variant="secondary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating…
                      </>
                    ) : (
                      "Create account"
                    )}
                  </Button>
                </div>
                {msgReg && (
                  <p className="text-sm text-muted-foreground">{msgReg}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <Card className="border-border/60 bg-card/70 shadow-sm">
            <CardHeader>
              <CardTitle>Guest Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Caption images without an account. A 24-hour guest session is
                created automatically on first use.
              </p>
              <p>
                Signing in merges guest history and keeps everything permanent.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/60">
            <CardHeader>
              <CardTitle className="text-sm">Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Passwords are hashed server-side.</p>
              <p>Tokens are stored locally for quick re-login.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
