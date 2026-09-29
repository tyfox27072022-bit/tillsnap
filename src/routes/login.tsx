import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "up") {
        const res = await authClient.signUp.email({ email, password, name: name || email });
        if (res.error) throw new Error(res.error.message || "Could not create the account");
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message || "Could not sign in");
      }
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto grid min-h-screen max-w-md content-center px-5 py-12">
      <h1 className="display text-4xl">TillSnap</h1>
      <p className="mt-2 text-muted">Managers and staff use the same sign-in. You pick your role after.</p>
      {authEnabled ? (
        <div className="mt-6 space-y-3">
          {GROK_PROVIDERS.map((p) => (
            <button
              key={p.providerId}
              type="button"
              className="w-full rounded-full border border-line bg-card px-4 py-3 font-semibold"
              onClick={() => signIn(p.providerId, { callbackURL: "/" })}
            >
              Continue with {p.label}
            </button>
          ))}
          <form className="space-y-2 rounded-xl border border-line bg-card p-4" onSubmit={submit}>
            <p className="font-semibold">{mode === "up" ? "Create an account" : "Email sign-in"}</p>
            {mode === "up" ? (
              <input
                className="w-full rounded-xl border border-line bg-paper px-3 py-3"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            ) : null}
            <input
              type="email"
              required
              className="w-full rounded-xl border border-line bg-paper px-3 py-3"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              required
              minLength={8}
              className="w-full rounded-xl border border-line bg-paper px-3 py-3"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <button type="submit" disabled={busy} className="w-full rounded-full bg-ink px-4 py-3 font-semibold text-paper">
              {busy ? "Please wait…" : mode === "up" ? "Create account" : "Sign in"}
            </button>
            <button
              type="button"
              className="w-full text-sm font-semibold text-accent"
              onClick={() => setMode(mode === "up" ? "in" : "up")}
            >
              {mode === "up" ? "Already have an account" : "Need an account"}
            </button>
          </form>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">Sign-in is disabled.</p>
      )}
    </main>
  );
}
