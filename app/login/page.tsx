"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Input, Label } from "@/components/ui";
import { Pill } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:gap-16">
        <div className="mb-10 max-w-xl text-white lg:mb-0">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-teal-100">
            <Pill size={14} /> Pharma Life Sciences ERP
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Manage discovery to commercial in one place
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
            Drug discovery, clinical trials, manufacturing, LIMS, quality, regulatory and CRM —
            connected through batch-level traceability.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8"
        >
          <h2 className="text-xl font-semibold text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Use your demo credentials to continue</p>

          <div className="mt-6 space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
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
              />
            </div>
            {error ? <Alert type="error">{error}</Alert> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </div>

          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
            <div>Demo logins (password after email):</div>
            <div><strong>admin@example.com</strong> / admin123 — ADMIN</div>
            <div><strong>production@example.com</strong> / prod123 — PRODUCTION</div>
            <div><strong>quality@example.com</strong> / qc123 — QUALITY (batch release)</div>
            <div><strong>warehouse@example.com</strong> / wh123 — WAREHOUSE</div>
            <div><strong>viewer@example.com</strong> / view123 — VIEWER (read-only)</div>
          </div>
        </form>
      </div>
    </div>
  );
}
