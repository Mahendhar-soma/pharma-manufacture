"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Input, Label } from "@/components/ui";
import BrandLogo from "@/components/brand/BrandLogo";
import { cn } from "@/lib/utils";

const DEMO_ACCOUNTS = [
  { email: "admin@example.com", password: "admin123", role: "ADMIN" },
  { email: "production@example.com", password: "prod123", role: "PRODUCTION" },
  { email: "quality@example.com", password: "qc123", role: "QUALITY (batch release)" },
  { email: "warehouse@example.com", password: "wh123", role: "WAREHOUSE" },
  { email: "viewer@example.com", password: "view123", role: "VIEWER (read-only)" },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyCredentials(account: (typeof DEMO_ACCOUNTS)[number]) {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Login failed");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to reach server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(13,148,136,0.35),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.25),_transparent_40%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-8 sm:px-6 sm:py-10 lg:flex-row lg:items-center lg:gap-16">
        <div className="mb-8 max-w-xl text-white sm:mb-10 lg:mb-0">
          <BrandLogo
            size="xl"
            subtitle="Life Sciences ERP"
            textClassName="text-white"
            className="mb-6 sm:mb-8"
            priority
          />
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
            Manage discovery to commercial in one place
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
            Drug discovery, clinical trials, manufacturing, LIMS, quality, regulatory and CRM —
            connected through batch-level traceability.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-5 shadow-2xl sm:p-8"
        >
          <h2 className="text-xl font-semibold text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">
            Click a demo account below to fill email and password
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                placeholder="Select a demo account or type email"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Password fills when you pick an account"
              />
            </div>
            {error ? <Alert type="error">{error}</Alert> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </div>

          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <div className="mb-2 font-medium text-slate-700">Demo logins — click to fill</div>
            <ul className="space-y-1.5">
              {DEMO_ACCOUNTS.map((account) => {
                const selected = email === account.email && password === account.password;
                return (
                  <li key={account.email}>
                    <button
                      type="button"
                      onClick={() => applyCredentials(account)}
                      className={cn(
                        "flex w-full flex-col rounded-lg border px-2.5 py-2 text-left transition sm:flex-row sm:items-center sm:justify-between sm:gap-2",
                        selected
                          ? "border-teal-600 bg-teal-50 text-teal-900 ring-1 ring-teal-600/30"
                          : "border-transparent hover:border-slate-200 hover:bg-white",
                      )}
                    >
                      <span>
                        <strong>{account.email}</strong>
                        <span className="text-slate-500"> / {account.password}</span>
                      </span>
                      <span className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-500 sm:mt-0">
                        {account.role}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
}
