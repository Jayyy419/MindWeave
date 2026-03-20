import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getOpportunity,
  grantOpportunityConsent,
  previewOpportunityAccess,
  type AccessScope,
  type OpportunityAccessPreview,
  type OpportunityDetail,
} from "@/services/api";
import { AlertCircle, ArrowLeft, Loader2, ShieldCheck } from "lucide-react";

const scopeLabels: Record<AccessScope, string> = {
  profileBasics: "Profile basics",
  interestProfile: "Interest profile",
  reflectionSummary: "Reflection summary",
  selectedJournalExcerpts: "Selected journal excerpts",
  fullJournalAccess: "Full journal access",
};

const durationOptions = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
  { value: "none", label: "No expiry" },
];

function formatPreviewValue(value: unknown): string {
  if (value === null || value === undefined) return "None";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

export function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [opportunity, setOpportunity] = useState<OpportunityDetail | null>(null);
  const [preview, setPreview] = useState<OpportunityAccessPreview | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<AccessScope[]>([]);
  const [duration, setDuration] = useState("90");
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    getOpportunity(id)
      .then((response) => {
        setOpportunity(response);
        setSelectedScopes(response.consent?.scopes?.length ? response.consent.scopes : response.requestedScopes);
      })
      .catch((err: Error) => setError(err.message || "Failed to load opportunity"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || selectedScopes.length === 0) {
      setPreview(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    previewOpportunityAccess(id, selectedScopes)
      .then((response) => {
        if (!cancelled) {
          setPreview(response);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message || "Failed to generate preview");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, selectedScopes]);

  const disabledGrant = !opportunity?.eligible || selectedScopes.length === 0 || saving;

  const requestedScopeSet = useMemo(() => new Set(opportunity?.requestedScopes ?? []), [opportunity?.requestedScopes]);

  function toggleScope(scope: AccessScope) {
    setSelectedScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]
    );
    setSuccess("");
  }

  async function handleGrantConsent() {
    if (!id || !opportunity) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const expiresAt =
        duration === "none"
          ? null
          : new Date(Date.now() + Number(duration) * 24 * 60 * 60 * 1000).toISOString();

      const consent = await grantOpportunityConsent({
        opportunityId: id,
        scopes: selectedScopes,
        expiresAt,
      });

      setOpportunity({
        ...opportunity,
        consent,
      });
      setSuccess("Access granted. You can revoke it later from Settings.");
    } catch (err: any) {
      setError(err.message || "Failed to grant consent");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!opportunity) {
    return <div className="py-12 text-center text-destructive">{error || "Opportunity not found"}</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/opportunities" className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-800">
        <ArrowLeft className="h-4 w-4" />
        Back to opportunities
      </Link>

      <div className="rounded-2xl border border-sky-200/80 bg-[linear-gradient(145deg,#eef9ff_0%,#ffffff_45%,#f5fbff_100%)] p-5 shadow-[0_16px_44px_-30px_rgba(30,91,116,0.38)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{opportunity.title}</h1>
            <p className="mt-1 text-sm text-stone-600">{opportunity.organizerName}</p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-700">{opportunity.description}</p>
          </div>

          {opportunity.consent ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Consent active
            </div>
          ) : (
            <div className={`rounded-full px-4 py-2 text-sm font-medium ${opportunity.eligible ? "border border-sky-200 bg-sky-50 text-sky-700" : "border border-stone-200 bg-stone-50 text-stone-600"}`}>
              {opportunity.eligible ? "Unlocked for review" : "Keep journaling to unlock this request"}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mb-1 inline h-4 w-4" /> {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <ShieldCheck className="mb-1 inline h-4 w-4" /> {success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-sky-200/80 bg-white/85 shadow-none">
          <CardHeader>
            <CardTitle className="text-lg text-stone-800">Consent review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 text-sm leading-6 text-stone-700">
              <p className="font-medium text-stone-900">What this organiser is asking for</p>
              <p className="mt-1">Select the exact profile scopes you are comfortable sharing. Only the scopes requested below are available for this opportunity.</p>
            </div>

            <div className="space-y-3">
              {opportunity.requestedScopes.map((scope) => (
                <label key={scope} className="flex items-start gap-3 rounded-xl border border-sky-100 bg-white p-4 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="mt-1 h-4 w-4 rounded border-sky-300 text-sky-700"
                    disabled={!requestedScopeSet.has(scope)}
                  />
                  <div>
                    <p className="font-medium text-stone-900">{scopeLabels[scope]}</p>
                    <p className="mt-1 text-xs leading-5 text-stone-600">
                      {scope === "profileBasics" && "Username, account age, level, badges, and basic participation signals."}
                      {scope === "interestProfile" && "Recurring tags and interest signals inferred from your activity."}
                      {scope === "reflectionSummary" && "A short summary of recent journal themes and patterns."}
                      {scope === "selectedJournalExcerpts" && "Short excerpts from recent entries, trimmed for preview sharing."}
                      {scope === "fullJournalAccess" && "Complete recent journal content. Use only when you intend to share everything requested."}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700">Access duration</label>
              <select
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                className="w-full rounded-md border border-sky-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:ring-2 focus:ring-sky-700/25"
              >
                {durationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleGrantConsent}
                disabled={disabledGrant}
                className="bg-sky-700 text-white hover:bg-sky-800"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {opportunity.consent ? "Update shared access" : "Grant selected access"}
              </Button>
              {!opportunity.eligible && (
                <p className="self-center text-sm text-stone-500">
                  This opportunity will unlock once your journal profile reaches the required fit.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-sky-200/80 bg-white/85 shadow-none">
            <CardHeader>
              <CardTitle className="text-lg text-stone-800">Why MindWeave surfaced this</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-stone-700">
              <p>{opportunity.summary}</p>
              <div className="flex flex-wrap gap-2">
                {opportunity.matchedTags.length > 0 ? (
                  opportunity.matchedTags.map((tag) => (
                    <Badge key={tag} variant="outline" className="border-sky-200 bg-sky-50/50 text-stone-700">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <p className="text-stone-500">No direct tags matched yet. More entries can improve fit detection.</p>
                )}
              </div>
              <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-4">
                <p>
                  Unlock threshold: at least {opportunity.minimumEntries} entries and level {opportunity.minimumLevel}.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-sky-200/80 bg-white/85 shadow-none">
            <CardHeader>
              <CardTitle className="text-lg text-stone-800">Live data preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-stone-700">
              {previewLoading ? (
                <div className="flex items-center gap-2 text-stone-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating preview...
                </div>
              ) : preview?.accessPackage ? (
                Object.entries(preview.accessPackage).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-sky-100 bg-sky-50/40 p-4">
                    <p className="mb-2 text-sm font-medium text-stone-900">{key}</p>
                    <pre className="whitespace-pre-wrap break-words text-xs leading-5 text-stone-700">
                      {formatPreviewValue(value)}
                    </pre>
                  </div>
                ))
              ) : (
                <p className="text-stone-500">Select one or more scopes to preview the package before granting access.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}