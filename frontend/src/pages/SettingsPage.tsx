import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  changePassword,
  checkUsernameAvailabilityForUser,
  getEntry,
  getProfile,
  listUserConsents,
  listEntries,
  revokeConsent,
  sendEmailChangeOtp,
  type AccessScope,
  type UserProfile,
  type UserConsentRecord,
  updateUsername,
  verifyEmailChangeOtp,
} from "@/services/api";
import { useUser } from "@/context/UserContext";
import { AlertCircle, Check, CheckCircle2, Loader2, Save, ShieldCheck, XCircle } from "lucide-react";

interface UserSettings {
  defaultFramework: "cbt" | "iceberg" | "growth" | "";
  defaultLiveReframeDelay: 3 | 5 | 10 | "";
  autoSaveInterval: 10 | 20 | 30 | 60;
  liveReframeEnabled: boolean;
  reframeTone: "gentle" | "direct";
  responseLength: "concise" | "balanced" | "detailed";
  fontSize: "small" | "medium" | "large";
  lineSpacing: "compact" | "normal" | "spacious";
  dyslexiaFriendlyFont: boolean;
  reducedMotion: boolean;
  remindersEnabled: boolean;
  streakNudges: boolean;
  emailReminders: boolean;
  reminderHour: number;
}

const DEFAULT_SETTINGS: UserSettings = {
  defaultFramework: "",
  defaultLiveReframeDelay: "",
  autoSaveInterval: 20,
  liveReframeEnabled: true,
  reframeTone: "gentle",
  responseLength: "balanced",
  fontSize: "medium",
  lineSpacing: "normal",
  dyslexiaFriendlyFont: false,
  reducedMotion: false,
  remindersEnabled: false,
  streakNudges: true,
  emailReminders: false,
  reminderHour: 9,
};

const ASK_EACH_TIME = "ask-each-time";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

const accessScopeLabels: Record<AccessScope, string> = {
  profileBasics: "Profile basics",
  interestProfile: "Interest profile",
  reflectionSummary: "Reflection summary",
  selectedJournalExcerpts: "Selected excerpts",
  fullJournalAccess: "Full journal access",
};

export function SettingsPage() {
  const { token, user, setSession } = useUser();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [changedSettings, setChangedSettings] = useState<Partial<UserSettings>>({});

  const [usernameDraft, setUsernameDraft] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameHint, setUsernameHint] = useState("");

  const [emailDraft, setEmailDraft] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailVerifiedForDraft, setEmailVerifiedForDraft] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatNewPassword, setRepeatNewPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAllEntries, setDeletingAllEntries] = useState(false);
  const [consents, setConsents] = useState<UserConsentRecord[]>([]);
  const [consentsLoading, setConsentsLoading] = useState(true);
  const [revokingConsentId, setRevokingConsentId] = useState<string | null>(null);

  const usernameChanged = useMemo(() => {
    return Boolean(profile) && usernameDraft.trim() !== (profile?.username || "");
  }, [profile, usernameDraft]);

  const emailChanged = useMemo(() => {
    return Boolean(profile) && emailDraft.trim().toLowerCase() !== (profile?.email || "").toLowerCase();
  }, [emailDraft, profile]);

  const passwordFieldsFilled =
    Boolean(currentPassword.trim()) || Boolean(newPassword.trim()) || Boolean(repeatNewPassword.trim());

  const newPasswordChecks = useMemo(
    () => ({
      minLength: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /\d/.test(newPassword),
      symbol: /[^A-Za-z0-9]/.test(newPassword),
      repeatMatches: repeatNewPassword.length > 0 && repeatNewPassword === newPassword,
    }),
    [newPassword, repeatNewPassword]
  );

  const hasChanges = Object.keys(changedSettings).length > 0 || usernameChanged || emailChanged || passwordFieldsFilled;

  useEffect(() => {
    getProfile()
      .then((nextProfile) => {
        setProfile(nextProfile);
        setUsernameDraft(nextProfile.username || "");
        setEmailDraft(nextProfile.email || "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    const storedSettings = localStorage.getItem("mindweave-settings");
    if (storedSettings) {
      try {
        setSettings(JSON.parse(storedSettings));
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    }

    listUserConsents()
      .then((records) => setConsents(records))
      .catch((err: Error) => setError((current) => current || err.message || "Failed to load shared access records"))
      .finally(() => setConsentsLoading(false));
  }, []);

  useEffect(() => {
    if (!usernameChanged) {
      setUsernameStatus("idle");
      setUsernameHint("");
      return;
    }

    const candidate = usernameDraft.trim();
    if (!/^[A-Za-z0-9_.-]{3,24}$/.test(candidate)) {
      setUsernameStatus("invalid");
      setUsernameHint("Use 3-24 chars: letters, numbers, ., _, -");
      return;
    }

    setUsernameStatus("checking");
    setUsernameHint("Checking availability...");

    const timer = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailabilityForUser(candidate);
        if (result.available) {
          setUsernameStatus("available");
          setUsernameHint("Username is available");
        } else {
          setUsernameStatus("taken");
          setUsernameHint("That username is already taken");
        }
      } catch (err: any) {
        setUsernameStatus("invalid");
        setUsernameHint(err.message || "Could not check username");
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [usernameChanged, usernameDraft]);

  function handleSettingChange<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setChangedSettings((current) => ({ ...current, [key]: value }));
    setSaveSuccess(false);
  }

  async function handleSendOtp() {
    if (!emailChanged) {
      setError("Enter a new email before requesting OTP.");
      return;
    }

    setError("");
    setOtpSending(true);
    try {
      await sendEmailChangeOtp(emailDraft.trim().toLowerCase());
      setSaveSuccess(true);
      setEmailVerifiedForDraft(false);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setOtpSending(false);
    }
  }

  async function handleVerifyOtp() {
    if (!emailDraft.trim() || !emailOtp.trim()) {
      setError("Enter both email and OTP.");
      return;
    }

    setError("");
    setOtpVerifying(true);
    try {
      const response = await verifyEmailChangeOtp({
        email: emailDraft.trim().toLowerCase(),
        otp: emailOtp.trim(),
      });

      setProfile((current) =>
        current
          ? {
              ...current,
              email: response.user.email,
              username: response.user.username,
            }
          : current
      );

      if (token) {
        setSession(token, response.user);
      }

      setEmailDraft(response.user.email);
      setEmailVerifiedForDraft(true);
      setSaveSuccess(true);
      setEmailOtp("");
    } catch (err: any) {
      setError(err.message || "Failed to verify OTP");
      setEmailVerifiedForDraft(false);
    } finally {
      setOtpVerifying(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaveSuccess(false);

    try {
      if (usernameChanged) {
        if (usernameStatus !== "available") {
          throw new Error("Please choose an available username before saving.");
        }

        const response = await updateUsername(usernameDraft.trim());
        setProfile((current) =>
          current
            ? {
                ...current,
                username: response.user.username,
                email: response.user.email,
              }
            : current
        );

        if (token) {
          setSession(token, response.user);
        }
      }

      if (emailChanged && !emailVerifiedForDraft) {
        throw new Error("Please verify your new email with OTP before saving.");
      }

      if (passwordFieldsFilled) {
        if (!currentPassword || !newPassword || !repeatNewPassword) {
          throw new Error("Fill in all password fields to change password.");
        }
        await changePassword({ currentPassword, newPassword, repeatNewPassword });
        setCurrentPassword("");
        setNewPassword("");
        setRepeatNewPassword("");
      }

      localStorage.setItem("mindweave-settings", JSON.stringify(settings));
      await new Promise((resolve) => setTimeout(resolve, 300));

      setChangedSettings({});
      setEmailVerifiedForDraft(false);
      setSaveSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleExportPdf() {
    setExportingPdf(true);
    setError("");

    try {
      const previews = await listEntries();
      if (previews.length === 0) {
        throw new Error("No entries available to export.");
      }

      const details = await Promise.all(previews.map((item) => getEntry(item.id)));
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 44;
      const bodyWidth = pageWidth - margin * 2;
      let y = margin;

      const ensureSpace = (needed: number) => {
        if (y + needed > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      doc.setFont("times", "bold");
      doc.setFontSize(18);
      doc.text("MindWeave Journal Export", margin, y);
      y += 24;
      doc.setFont("times", "normal");
      doc.setFontSize(11);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
      y += 24;

      details.forEach((entry, index) => {
        ensureSpace(100);

        doc.setFont("times", "bold");
        doc.setFontSize(13);
        doc.text(`Entry ${index + 1}`, margin, y);
        y += 16;

        doc.setFont("times", "normal");
        doc.setFontSize(11);
        doc.text(`Date: ${new Date(entry.createdAt).toLocaleString()}`, margin, y);
        y += 14;
        doc.text(`Framework: ${entry.framework.toUpperCase()}`, margin, y);
        y += 16;

        doc.setFont("times", "bold");
        doc.text("Original", margin, y);
        y += 14;
        doc.setFont("times", "normal");
        const originalLines = doc.splitTextToSize(entry.originalText, bodyWidth);
        originalLines.forEach((line: string) => {
          ensureSpace(14);
          doc.text(line, margin, y);
          y += 14;
        });

        y += 8;
        ensureSpace(28);

        doc.setFont("times", "bold");
        doc.text("Reframed", margin, y);
        y += 14;
        doc.setFont("times", "normal");
        const reframedLines = doc.splitTextToSize(entry.reframedText, bodyWidth);
        reframedLines.forEach((line: string) => {
          ensureSpace(14);
          doc.text(line, margin, y);
          y += 14;
        });

        y += 20;
      });

      doc.save(`mindweave-export-${Date.now()}.pdf`);
      setSaveSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to export PDF");
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleDeleteAllEntries() {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setDeletingAllEntries(true);
    setError("");

    try {
      setShowDeleteConfirm(false);
      setSaveSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to delete entries");
    } finally {
      setDeletingAllEntries(false);
    }
  }

  async function handleRevokeConsent(consentId: string) {
    setRevokingConsentId(consentId);
    setError("");

    try {
      const result = await revokeConsent(consentId);
      setConsents((current) =>
        current.map((record) =>
          record.id === consentId
            ? {
                ...record,
                status: result.status,
                revokedAt: result.revokedAt,
              }
            : record
        )
      );
      setSaveSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to revoke shared access");
    } finally {
      setRevokingConsentId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl border border-amber-200/80 bg-[linear-gradient(145deg,#fff9ee_0%,#fffef7_45%,#f8f8ef_100%)] p-5 shadow-[0_16px_44px_-30px_rgba(74,53,21,0.45)]">
        <h1 className="text-2xl font-bold text-stone-800">Settings</h1>
        <p className="mt-1 text-sm text-stone-600">Customize your MindWeave experience</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mb-1 inline h-4 w-4" /> {error}
        </div>
      )}

      {saveSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <Check className="mb-1 inline h-4 w-4" /> Update successful.
        </div>
      )}

      <Card className="border-amber-200/80 bg-white/80 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg text-stone-800">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Username</label>
            <input
              value={usernameDraft}
              onChange={(event) => setUsernameDraft(event.target.value)}
              className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:ring-2 focus:ring-emerald-700/30"
            />
            {usernameHint && (
              <p
                className={`mt-1 text-xs ${
                  usernameStatus === "available" ? "text-emerald-700" : usernameStatus === "checking" ? "text-stone-500" : "text-rose-700"
                }`}
              >
                {usernameHint}
              </p>
            )}
          </div>

          <div className="space-y-2 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
            <label className="block text-sm font-medium text-stone-700">Email</label>
            <input
              type="email"
              value={emailDraft}
              onChange={(event) => {
                setEmailDraft(event.target.value);
                setEmailVerifiedForDraft(false);
              }}
              className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:ring-2 focus:ring-emerald-700/30"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleSendOtp} disabled={otpSending || !emailChanged}>
                {otpSending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                Send OTP
              </Button>
              <input
                value={emailOtp}
                onChange={(event) => setEmailOtp(event.target.value)}
                placeholder="Enter OTP"
                className="h-9 w-40 rounded-md border border-amber-200 bg-white px-2 text-sm text-stone-700 outline-none focus:ring-2 focus:ring-emerald-700/30"
              />
              <Button type="button" size="sm" onClick={handleVerifyOtp} disabled={otpVerifying || !emailChanged}>
                {otpVerifying ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                Verify OTP
              </Button>
            </div>
            {emailChanged && !emailVerifiedForDraft && (
              <p className="text-xs text-stone-600">Email change requires OTP verification before save.</p>
            )}
            {emailChanged && emailVerifiedForDraft && <p className="text-xs text-emerald-700">Email verified and updated.</p>}
          </div>

          <div className="space-y-2 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
            <p className="text-sm font-medium text-stone-700">Change Password</p>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Current password"
              className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:ring-2 focus:ring-emerald-700/30"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New password"
              className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:ring-2 focus:ring-emerald-700/30"
            />
            <input
              type="password"
              value={repeatNewPassword}
              onChange={(event) => setRepeatNewPassword(event.target.value)}
              placeholder="Repeat new password"
              className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:ring-2 focus:ring-emerald-700/30"
            />
            <div className="rounded-lg border border-amber-200 bg-white/70 p-3 text-xs text-stone-700">
              <p className="mb-2 font-medium text-stone-800">Password requirements</p>
              <ul className="space-y-1">
                <li className="flex items-center gap-1.5">
                  {newPasswordChecks.minLength ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> : <XCircle className="h-3.5 w-3.5 text-rose-700" />}
                  At least 8 characters
                </li>
                <li className="flex items-center gap-1.5">
                  {newPasswordChecks.uppercase ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> : <XCircle className="h-3.5 w-3.5 text-rose-700" />}
                  One uppercase letter
                </li>
                <li className="flex items-center gap-1.5">
                  {newPasswordChecks.lowercase ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> : <XCircle className="h-3.5 w-3.5 text-rose-700" />}
                  One lowercase letter
                </li>
                <li className="flex items-center gap-1.5">
                  {newPasswordChecks.number ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> : <XCircle className="h-3.5 w-3.5 text-rose-700" />}
                  One number
                </li>
                <li className="flex items-center gap-1.5">
                  {newPasswordChecks.symbol ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> : <XCircle className="h-3.5 w-3.5 text-rose-700" />}
                  One symbol
                </li>
                <li className="flex items-center gap-1.5">
                  {newPasswordChecks.repeatMatches ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> : <XCircle className="h-3.5 w-3.5 text-rose-700" />}
                  New password fields match
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200/80 bg-white/80 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg text-stone-800">Journal Experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-stone-700">Default Reframing Framework</label>
            <p className="mb-2 text-xs text-stone-500">Auto-select this framework when you start writing</p>
            <Select
              value={settings.defaultFramework || ASK_EACH_TIME}
              onValueChange={(v: string) =>
                handleSettingChange("defaultFramework", v === ASK_EACH_TIME ? "" : (v as "cbt" | "iceberg" | "growth"))
              }
            >
              <SelectTrigger className="border-amber-200 bg-white">
                <SelectValue placeholder="Use prompt each time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ASK_EACH_TIME}>Ask me each time</SelectItem>
                <SelectItem value="cbt">CBT (Cognitive Behavioral Therapy)</SelectItem>
                <SelectItem value="iceberg">Iceberg Model</SelectItem>
                <SelectItem value="growth">Growth Mindset</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-stone-700">Default Reframe Countdown</label>
            <p className="mb-2 text-xs text-stone-500">Default pause before auto-reframing</p>
            <Select
              value={settings.defaultLiveReframeDelay ? String(settings.defaultLiveReframeDelay) : ASK_EACH_TIME}
              onValueChange={(v) =>
                handleSettingChange("defaultLiveReframeDelay", v === ASK_EACH_TIME ? "" : (Number(v) as 3 | 5 | 10))
              }
            >
              <SelectTrigger className="border-amber-200 bg-white">
                <SelectValue placeholder="Ask me each time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ASK_EACH_TIME}>Ask me each time</SelectItem>
                <SelectItem value="3">3 seconds</SelectItem>
                <SelectItem value="5">5 seconds</SelectItem>
                <SelectItem value="10">10 seconds</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-stone-700">Auto-Save Interval</label>
            <p className="mb-2 text-xs text-stone-500">How frequently to save drafts</p>
            <Select
              value={String(settings.autoSaveInterval)}
              onValueChange={(v) => handleSettingChange("autoSaveInterval", Number(v) as 10 | 20 | 30 | 60)}
            >
              <SelectTrigger className="border-amber-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">Every 10 seconds</SelectItem>
                <SelectItem value="20">Every 20 seconds</SelectItem>
                <SelectItem value="30">Every 30 seconds</SelectItem>
                <SelectItem value="60">Every 60 seconds</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
            <input
              type="checkbox"
              checked={settings.liveReframeEnabled}
              onChange={(e) => handleSettingChange("liveReframeEnabled", e.target.checked)}
              className="h-4 w-4 rounded border-amber-300 text-amber-700"
            />
            <div>
              <p className="text-sm font-medium text-stone-700">Enable Live Reframing</p>
              <p className="text-xs text-stone-600">Show AI reframes as you type</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200/80 bg-white/80 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg text-stone-800">AI Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-stone-700">Reframing Tone</label>
            <p className="mb-2 text-xs text-stone-500">How the AI delivers perspective shifts</p>
            <Select value={settings.reframeTone} onValueChange={(v: any) => handleSettingChange("reframeTone", v)}>
              <SelectTrigger className="border-amber-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gentle">Gentle and compassionate</SelectItem>
                <SelectItem value="direct">Direct and practical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-stone-700">Response Length</label>
            <p className="mb-2 text-xs text-stone-500">Preferred depth of AI responses</p>
            <Select value={settings.responseLength} onValueChange={(v: any) => handleSettingChange("responseLength", v)}>
              <SelectTrigger className="border-amber-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concise">Concise (brief, to the point)</SelectItem>
                <SelectItem value="balanced">Balanced (moderate depth)</SelectItem>
                <SelectItem value="detailed">Detailed (thorough exploration)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200/80 bg-white/80 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg text-stone-800">Accessibility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-stone-700">Font Size</label>
            <p className="mb-2 text-xs text-stone-500">Adjust text size for comfort</p>
            <Select value={settings.fontSize} onValueChange={(v: any) => handleSettingChange("fontSize", v)}>
              <SelectTrigger className="border-amber-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium (default)</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-stone-700">Line Spacing</label>
            <p className="mb-2 text-xs text-stone-500">Distance between lines of text</p>
            <Select value={settings.lineSpacing} onValueChange={(v: any) => handleSettingChange("lineSpacing", v)}>
              <SelectTrigger className="border-amber-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="normal">Normal (default)</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
            <input
              type="checkbox"
              checked={settings.dyslexiaFriendlyFont}
              onChange={(e) => handleSettingChange("dyslexiaFriendlyFont", e.target.checked)}
              className="h-4 w-4 rounded border-amber-300 text-amber-700"
            />
            <div>
              <p className="text-sm font-medium text-stone-700">Dyslexia-Friendly Font</p>
              <p className="text-xs text-stone-600">Use enhanced legibility typeface</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => handleSettingChange("reducedMotion", e.target.checked)}
              className="h-4 w-4 rounded border-amber-300 text-amber-700"
            />
            <div>
              <p className="text-sm font-medium text-stone-700">Reduce Motion</p>
              <p className="text-xs text-stone-600">Minimize animations and transitions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200/80 bg-white/80 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg text-stone-800">Notifications & Reminders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
            <input
              type="checkbox"
              checked={settings.remindersEnabled}
              onChange={(e) => handleSettingChange("remindersEnabled", e.target.checked)}
              className="h-4 w-4 rounded border-amber-300 text-amber-700"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-stone-700">Writing Reminders</p>
              <p className="text-xs text-stone-600">Get reminders to journal daily</p>
            </div>
          </div>

          {settings.remindersEnabled && (
            <div className="ml-7 space-y-2">
              <label className="text-xs font-medium text-stone-700">Reminder Time</label>
              <Select value={String(settings.reminderHour)} onValueChange={(v: any) => handleSettingChange("reminderHour", parseInt(v, 10))}>
                <SelectTrigger className="border-amber-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {i.toString().padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
            <input
              type="checkbox"
              checked={settings.streakNudges}
              onChange={(e) => handleSettingChange("streakNudges", e.target.checked)}
              className="h-4 w-4 rounded border-amber-300 text-amber-700"
            />
            <div>
              <p className="text-sm font-medium text-stone-700">Streak Nudges</p>
              <p className="text-xs text-stone-600">Motivational push to keep streaks alive</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
            <input
              type="checkbox"
              checked={settings.emailReminders}
              onChange={(e) => handleSettingChange("emailReminders", e.target.checked)}
              className="h-4 w-4 rounded border-amber-300 text-amber-700"
            />
            <div>
              <p className="text-sm font-medium text-stone-700">Email Notifications</p>
              <p className="text-xs text-stone-600">Send notifications via email instead of in-app</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-rose-200/80 bg-white/80 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg text-stone-800">Privacy & Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-sky-100 bg-sky-50/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="font-medium text-stone-900">Shared Access</h4>
                <p className="mt-1 text-xs leading-5 text-stone-600">
                  Manage every organiser or opportunity that currently has consent-based access to your MindWeave profile package.
                </p>
              </div>
              <Link to="/opportunities">
                <Button type="button" size="sm" variant="outline" className="border-sky-200 bg-white">
                  Review opportunities
                </Button>
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {consentsLoading ? (
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading shared access records...
                </div>
              ) : consents.length === 0 ? (
                <p className="text-sm text-stone-500">No opportunity access has been granted yet.</p>
              ) : (
                consents.map((consent) => (
                  <div key={consent.id} className="rounded-xl border border-sky-100 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-stone-900">{consent.opportunity.title}</p>
                          {consent.revokedAt ? (
                            <Badge variant="outline" className="border-stone-200 bg-stone-50 text-stone-600">
                              Revoked
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                              <ShieldCheck className="mr-1 h-3 w-3" /> Active
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-stone-600">{consent.organizerSnapshot}</p>
                        <p className="mt-2 text-xs leading-5 text-stone-500">{consent.purposeSnapshot}</p>
                      </div>

                      {!consent.revokedAt && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleRevokeConsent(consent.id)}
                          disabled={revokingConsentId === consent.id}
                          className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                        >
                          {revokingConsentId === consent.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                          Revoke access
                        </Button>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {consent.scopes.map((scope) => (
                        <Badge key={scope} variant="outline" className="border-sky-200 bg-sky-50/50 text-stone-700">
                          {accessScopeLabels[scope]}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-stone-500 md:grid-cols-2">
                      <p>Granted: {new Date(consent.grantedAt).toLocaleString()}</p>
                      <p>
                        {consent.revokedAt
                          ? `Revoked: ${new Date(consent.revokedAt).toLocaleString()}`
                          : consent.expiresAt
                            ? `Expires: ${new Date(consent.expiresAt).toLocaleString()}`
                            : "No expiry set"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={handleExportPdf} disabled={exportingPdf}>
            {exportingPdf ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
            Export All Entries (PDF)
          </Button>

          <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-4">
            <h4 className="mb-2 font-medium text-rose-900">Delete All Entries</h4>
            <p className="mb-3 text-xs text-rose-800">This action cannot be undone. All your journal entries will be permanently deleted.</p>

            {showDeleteConfirm ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-rose-900">Are you sure? This cannot be undone.</p>
                <div className="flex gap-2">
                  <Button type="button" onClick={handleDeleteAllEntries} disabled={deletingAllEntries} className="h-8 bg-rose-700 hover:bg-rose-800" size="sm">
                    {deletingAllEntries ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                    Yes, delete all entries
                  </Button>
                  <Button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={deletingAllEntries} variant="outline" size="sm" className="h-8">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" onClick={handleDeleteAllEntries} className="gap-2 bg-rose-700 hover:bg-rose-800" size="sm">
                Delete All Entries
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!hasChanges || saving} className="gap-2 bg-emerald-700 hover:bg-emerald-800">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
