import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProfile, type UserProfile } from "@/services/api";
import { useUser } from "@/context/UserContext";
import { Loader2, Save, AlertCircle, Check } from "lucide-react";

interface UserSettings {
  // Journal Experience
  defaultFramework: "cbt" | "iceberg" | "growth" | "";
  defaultLiveReframeDelay: 3 | 5 | 10 | "";
  autoSaveInterval: 10 | 20 | 30 | 60;
  liveReframeEnabled: boolean;

  // AI Preferences
  reframeTone: "gentle" | "direct";
  responseLength: "concise" | "balanced" | "detailed";
  strictJournalOnlyMode: boolean;

  // Accessibility
  fontSize: "small" | "medium" | "large";
  lineSpacing: "compact" | "normal" | "spacious";
  dyslexiaFriendlyFont: boolean;
  reducedMotion: boolean;

  // Notifications
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
  strictJournalOnlyMode: true,
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

export function SettingsPage() {
  const { user, logout } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [changedSettings, setChangedSettings] = useState<Partial<UserSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAllEntries, setDeletingAllEntries] = useState(false);

  useEffect(() => {
    // Load profile and settings (settings would come from backend in production)
    getProfile()
      .then(setProfile)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    // Load settings from localStorage for now (replace with API call in production)
    const storedSettings = localStorage.getItem("mindweave-settings");
    if (storedSettings) {
      try {
        setSettings(JSON.parse(storedSettings));
      } catch {
        // Use defaults
      }
    }
  }, []);

  function handleSettingChange<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setChangedSettings((current) => ({ ...current, [key]: value }));
    setSaveSuccess(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaveSuccess(false);

    try {
      // In production, POST to /api/user/settings
      // For now, save to localStorage
      localStorage.setItem("mindweave-settings", JSON.stringify(settings));

      // Simulate save latency
      await new Promise((resolve) => setTimeout(resolve, 500));

      setSaveSuccess(true);
      setChangedSettings({});
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
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
      // In production: POST /api/entries/delete-all
      // For now, show confirmation
      setShowDeleteConfirm(false);
      setSaveSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to delete entries");
    } finally {
      setDeletingAllEntries(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasChanges = Object.keys(changedSettings).length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-amber-200/80 bg-[linear-gradient(145deg,#fff9ee_0%,#fffef7_45%,#f8f8ef_100%)] p-5 shadow-[0_16px_44px_-30px_rgba(74,53,21,0.45)]">
        <h1 className="text-2xl font-bold text-stone-800">Settings</h1>
        <p className="mt-1 text-sm text-stone-600">Customize your MindWeave experience</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mb-1 inline h-4 w-4" />
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <Check className="mb-1 inline h-4 w-4" />
          Settings saved successfully.
        </div>
      )}

      {/* Account Settings */}
      <Card className="border-amber-200/80 bg-white/80 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg text-stone-800">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-4">
            <p className="text-sm font-medium text-stone-700">{user?.username}</p>
            <p className="text-xs text-stone-600">{user?.email}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            Change Password
          </Button>
        </CardContent>
      </Card>

      {/* Journal Experience Settings */}
      <Card className="border-amber-200/80 bg-white/80 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg text-stone-800">Journal Experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-stone-700">Default Reframing Framework</label>
            <p className="text-xs text-stone-500 mb-2">Auto-select this framework when you start writing</p>
            <Select
              value={settings.defaultFramework || ASK_EACH_TIME}
              onValueChange={(v: string) =>
                handleSettingChange(
                  "defaultFramework",
                  v === ASK_EACH_TIME ? "" : (v as "cbt" | "iceberg" | "growth")
                )
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
            <p className="text-xs text-stone-500 mb-2">Default pause before auto-reframing</p>
            <Select 
              value={settings.defaultLiveReframeDelay ? String(settings.defaultLiveReframeDelay) : ASK_EACH_TIME} 
              onValueChange={(v) =>
                handleSettingChange(
                  "defaultLiveReframeDelay",
                  v === ASK_EACH_TIME ? "" : (Number(v) as 3 | 5 | 10)
                )
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
            <p className="text-xs text-stone-500 mb-2">How frequently to save drafts</p>
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

      {/* AI Preferences */}
      <Card className="border-amber-200/80 bg-white/80 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg text-stone-800">AI Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-stone-700">Reframing Tone</label>
            <p className="text-xs text-stone-500 mb-2">How the AI delivers perspective shifts</p>
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
            <p className="text-xs text-stone-500 mb-2">Preferred depth of AI responses</p>
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

          <div className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
            <input
              type="checkbox"
              checked={settings.strictJournalOnlyMode}
              onChange={(e) => handleSettingChange("strictJournalOnlyMode", e.target.checked)}
              className="h-4 w-4 rounded border-emerald-300 text-emerald-700"
            />
            <div>
              <p className="text-sm font-medium text-stone-700">Strict Journal-Only Mode</p>
              <p className="text-xs text-stone-600">Enforce personal journaling use (prevents off-topic requests)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card className="border-amber-200/80 bg-white/80 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg text-stone-800">Accessibility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-stone-700">Font Size</label>
            <p className="text-xs text-stone-500 mb-2">Adjust text size for comfort</p>
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
            <p className="text-xs text-stone-500 mb-2">Distance between lines of text</p>
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

      {/* Notifications and Reminders */}
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
              <Select value={String(settings.reminderHour)} onValueChange={(v: any) => handleSettingChange("reminderHour", parseInt(v))}>
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

      {/* Privacy and Data Management */}
      <Card className="border-rose-200/80 bg-white/80 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg text-stone-800">Privacy & Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" size="sm" className="gap-2">
            Export All Entries (JSON)
          </Button>

          <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-4">
            <h4 className="mb-2 font-medium text-rose-900">Delete All Entries</h4>
            <p className="mb-3 text-xs text-rose-800">This action cannot be undone. All your journal entries will be permanently deleted.</p>

            {showDeleteConfirm ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-rose-900">Are you sure? This cannot be undone.</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleDeleteAllEntries}
                    disabled={deletingAllEntries}
                    className="h-8 bg-rose-700 hover:bg-rose-800"
                    size="sm"
                  >
                    {deletingAllEntries ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                    Yes, delete all entries
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deletingAllEntries}
                    variant="outline"
                    size="sm"
                    className="h-8"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleDeleteAllEntries}
                className="gap-2 bg-rose-700 hover:bg-rose-800"
                size="sm"
              >
                Delete All Entries
              </Button>
            )}
          </div>

          <Button variant="outline" size="sm" className="gap-2 text-rose-700 hover:text-rose-800">
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {/* Save and Logout Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="gap-2 bg-emerald-700 hover:bg-emerald-800"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save Settings"}
        </Button>
        <Button variant="outline" onClick={logout}>
          Logout
        </Button>
      </div>
    </div>
  );
}
