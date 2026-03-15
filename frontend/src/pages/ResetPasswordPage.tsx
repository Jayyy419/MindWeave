import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resetPassword } from "@/services/api";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token") || "", [params]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Reset token is missing. Please open the latest link from your email.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await resetPassword(token, password);
      setSuccess(response.message || "Password reset successful. You can log in now.");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cyan-50 via-white to-emerald-50 px-4 py-10">
      <Card className="w-full max-w-md border-slate-200/70 bg-white/90 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">Reset your password</CardTitle>
          <p className="text-sm text-muted-foreground">Create a new password for your MindWeave account.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">New password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-cyan-300"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-cyan-300"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-700">{success}</p>}

            <Button type="submit" className="w-full bg-cyan-700 hover:bg-cyan-800" disabled={loading}>
              {loading ? "Resetting..." : "Reset password"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Remembered your password? <Link to="/" className="text-cyan-700 underline underline-offset-4">Back to login</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
