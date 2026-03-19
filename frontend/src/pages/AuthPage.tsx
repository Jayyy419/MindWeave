import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { checkUsernameAvailability, forgotPassword, login, register } from "@/services/api";
import { useUser } from "@/context/UserContext";
import { CheckCircle2, Mail, PenLine, XCircle } from "lucide-react";

type UsernameCheckState = "idle" | "checking" | "available" | "taken" | "invalid";

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

  const [usernameCheckState, setUsernameCheckState] = useState<UsernameCheckState>("idle");
  const [usernameCheckText, setUsernameCheckText] = useState("");

  const passwordChecks = useMemo(
    () => ({
      minLength: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      symbol: /[^A-Za-z0-9]/.test(password),
    }),
    [password]
  );

  const isPasswordStrong =
    passwordChecks.minLength &&
    passwordChecks.uppercase &&
    passwordChecks.lowercase &&
    passwordChecks.number &&
    passwordChecks.symbol;

  useEffect(() => {
    if (mode !== "register") {
      setUsernameCheckState("idle");
      setUsernameCheckText("");
      return;
    }

    const candidate = username.trim();
    if (!candidate) {
      setUsernameCheckState("idle");
      setUsernameCheckText("");
      return;
    }

    if (!/^[A-Za-z0-9_.-]{3,24}$/.test(candidate)) {
      setUsernameCheckState("invalid");
      setUsernameCheckText("Use 3-24 chars: letters, numbers, ., _, -");
      return;
    }

    setUsernameCheckState("checking");
    setUsernameCheckText("Checking username...");

    const timer = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailability(candidate);
        if (result.available) {
          setUsernameCheckState("available");
          setUsernameCheckText("Username is available");
        } else {
          setUsernameCheckState("taken");
          setUsernameCheckText("Username already in use");
        }
      } catch (err: any) {
        setUsernameCheckState("invalid");
        setUsernameCheckText(err.message || "Could not check username");
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [mode, username]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (mode === "register") {
      if (usernameCheckState !== "available") {
        setError("Please choose an available username.");
        return;
      }
      if (!isPasswordStrong) {
        setError("Password must satisfy all required conditions.");
        return;
      }
    }

    setLoading(true);

    try {
      const response =
        mode === "register"
          ? await register({ email, username: username.trim(), password })
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(165deg,#f7f1e3_0%,#fcfaf4_42%,#f0ede2_100%)] px-4 py-6">
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(148,103,45,0.16)_0.7px,transparent_0.7px)] [background-size:16px_16px]" />
      <div className="mx-auto grid w-full max-w-6xl items-stretch gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card className="hidden overflow-hidden border-amber-200/80 bg-[repeating-linear-gradient(to_bottom,#fffef9_0px,#fffef9_38px,#ece7dc_39px)] shadow-[0_22px_46px_-28px_rgba(74,53,21,0.45)] lg:block">
          <CardContent className="relative p-8">
            <div className="absolute inset-y-0 left-10 w-px bg-rose-200/80" />
            <div className="pl-8">
              <p className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-xs uppercase tracking-[0.16em] text-amber-800">
                <PenLine className="h-3.5 w-3.5" />
                MindWeave Journal
              </p>
              <h1 className="mt-5 text-4xl leading-tight text-stone-800" style={{ fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif" }}>
                Every thought deserves a page.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-stone-700">
                Write what happened, how it felt, and what you are learning. MindWeave helps you reframe emotions into clarity while keeping your journal voice at the center.
              </p>

              <div className="mt-8 space-y-3 text-sm text-stone-700">
                <p>1. Capture your day in plain words.</p>
                <p>2. Apply a framework that matches your moment.</p>
                <p>3. Keep a memory lane of growth over time.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full border-amber-200/80 bg-white/90 shadow-[0_20px_44px_-30px_rgba(74,53,21,0.45)]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl text-stone-800" style={{ fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif" }}>
              {mode === "login" ? "Welcome back" : "Create your journal account"}
            </CardTitle>
            <p className="text-sm text-stone-600">
              {mode === "login"
                ? "Sign in to continue writing and reframing your reflections."
                : "Set up your account to start mindful journaling with AI support."}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:ring-2 focus:ring-amber-400/40"
                />
              </div>

              {mode === "register" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                    className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:ring-2 focus:ring-amber-400/40"
                  />
                  {usernameCheckText && (
                    <p
                      className={`mt-1 text-xs ${
                        usernameCheckState === "available"
                          ? "text-emerald-700"
                          : usernameCheckState === "checking"
                            ? "text-stone-500"
                            : "text-rose-700"
                      }`}
                    >
                      {usernameCheckText}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:ring-2 focus:ring-amber-400/40"
                />
              </div>

              {mode === "register" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 text-xs text-stone-700">
                  <p className="mb-2 font-medium text-stone-800">Password requirements</p>
                  <ul className="space-y-1">
                    <li className="flex items-center gap-1.5">
                      {passwordChecks.minLength ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> : <XCircle className="h-3.5 w-3.5 text-rose-700" />}
                      At least 8 characters
                    </li>
                    <li className="flex items-center gap-1.5">
                      {passwordChecks.uppercase ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> : <XCircle className="h-3.5 w-3.5 text-rose-700" />}
                      One uppercase letter
                    </li>
                    <li className="flex items-center gap-1.5">
                      {passwordChecks.lowercase ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> : <XCircle className="h-3.5 w-3.5 text-rose-700" />}
                      One lowercase letter
                    </li>
                    <li className="flex items-center gap-1.5">
                      {passwordChecks.number ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> : <XCircle className="h-3.5 w-3.5 text-rose-700" />}
                      One number
                    </li>
                    <li className="flex items-center gap-1.5">
                      {passwordChecks.symbol ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> : <XCircle className="h-3.5 w-3.5 text-rose-700" />}
                      One symbol
                    </li>
                  </ul>
                </div>
              )}

              {error && <p className="text-sm text-rose-700">{error}</p>}

              <Button type="submit" className="w-full bg-amber-700 text-amber-50 hover:bg-amber-800" disabled={loading}>
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
                className="text-sm text-amber-700 underline underline-offset-4"
              >
                {mode === "login" ? "Need an account? Register" : "Already have an account? Log in"}
              </button>

              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => {
                    setShowForgot((value) => !value);
                    setForgotMessage("");
                    setForgotEmail(email);
                  }}
                  className="inline-flex items-center gap-1 text-sm text-stone-600 underline underline-offset-4"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Forgot password?
                </button>
              )}
            </div>

            {showForgot && (
              <form onSubmit={handleForgotPassword} className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50/45 p-4">
                <p className="text-sm font-medium text-stone-800">Reset your password</p>
                <p className="text-xs text-stone-600">Enter your registered email and we will send you a reset link.</p>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  required
                  className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:ring-2 focus:ring-amber-400/40"
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
