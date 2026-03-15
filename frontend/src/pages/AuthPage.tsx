import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { forgotPassword, login, register } from "@/services/api";
import { useUser } from "@/context/UserContext";
import { BrainCircuit, Mail, Sparkles } from "lucide-react";

export function AuthPage() {
  const { setSession } = useUser();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response =
        mode === "register"
          ? await register({ email, username, password })
          : await login({ email, password });

      setSession(response.token, {
        id: response.user.id,
        email: response.user.email,
        username: response.user.username,
      });
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setForgotMessage("");
    setForgotLoading(true);

    try {
      const response = await forgotPassword(forgotEmail);
      setForgotMessage(response.message);
    } catch (err: any) {
      setError(err.message || "Could not send reset email");
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-cyan-50 via-white to-emerald-50 px-4 py-10">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-16 h-72 w-72 rounded-full bg-emerald-200/50 blur-3xl" />

      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card className="relative hidden border-cyan-100 bg-white/70 backdrop-blur lg:block">
          <CardContent className="space-y-8 p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-sm text-cyan-900">
              <Sparkles className="h-4 w-4" />
              MindWeave
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">Reflect better. Think clearer.</h1>
              <p className="max-w-md text-slate-600">
                MindWeave helps you reframe stressful thoughts, uncover patterns, and grow through guided journaling and supportive think tanks.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="rounded-xl border border-cyan-100 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">AI Reframing</p>
                <p className="mt-1 text-sm text-slate-600">Turn emotional spirals into constructive perspectives using cognitive frameworks.</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Think Tanks</p>
                <p className="mt-1 text-sm text-slate-600">Join curated peer groups aligned to your growth tags and shared goals.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full border-slate-200/70 bg-white/90 backdrop-blur">
          <CardHeader className="space-y-3">
            <div className="inline-flex items-center gap-2 text-cyan-700 lg:hidden">
              <BrainCircuit className="h-5 w-5" />
              <span className="font-semibold">MindWeave</span>
            </div>
            <CardTitle className="text-2xl">{mode === "login" ? "Welcome back" : "Create your account"}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {mode === "login"
                ? "Log in to continue your reflection journey."
                : "Start journaling with AI-guided reflection."}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-cyan-300"
                />
              </div>

              {mode === "register" && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-cyan-300"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-cyan-300"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full bg-cyan-700 hover:bg-cyan-800" disabled={loading}>
                {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create account"}
              </Button>
            </form>

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError("");
                }}
                className="text-sm text-cyan-700 underline underline-offset-4"
              >
                {mode === "login"
                  ? "Need an account? Register"
                  : "Already have an account? Log in"}
              </button>

              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => {
                    setShowForgot((value) => !value);
                    setForgotMessage("");
                    setForgotEmail(email);
                  }}
                  className="inline-flex items-center gap-1 text-sm text-slate-600 underline underline-offset-4"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Forgot password?
                </button>
              )}
            </div>

            {showForgot && (
              <form onSubmit={handleForgotPassword} className="mt-4 space-y-3 rounded-lg border border-cyan-100 bg-cyan-50/60 p-4">
                <p className="text-sm font-medium text-slate-800">Reset your password</p>
                <p className="text-xs text-slate-600">Enter your registered email and we will send you a reset link.</p>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  required
                  className="w-full rounded-md border bg-white px-3 py-2 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-cyan-300"
                  placeholder="you@example.com"
                />
                <Button type="submit" variant="secondary" className="w-full" disabled={forgotLoading}>
                  {forgotLoading ? "Sending reset email..." : "Send reset email"}
                </Button>
                {forgotMessage && <p className="text-xs text-emerald-700">{forgotMessage}</p>}
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
