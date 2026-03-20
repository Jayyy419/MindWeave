import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listOpportunities, type AccessScope, type OpportunitySummary } from "@/services/api";
import { ArrowRight, Loader2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";

const scopeLabels: Record<AccessScope, string> = {
  profileBasics: "Profile basics",
  interestProfile: "Interest profile",
  reflectionSummary: "Reflection summary",
  selectedJournalExcerpts: "Selected excerpts",
  fullJournalAccess: "Full journal access",
};

export function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<OpportunitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<{ entryCount: number; level: number; userTags: string[] } | null>(null);

  useEffect(() => {
    listOpportunities()
      .then((response) => {
        setOpportunities(response.opportunities);
        setOverview(response.overview);
      })
      .catch((err: Error) => setError(err.message || "Failed to load opportunities"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <div className="py-12 text-center text-destructive">{error}</div>;
  }

  const sharedCount = opportunities.filter((item) => item.consent).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl border border-sky-200/80 bg-[linear-gradient(145deg,#eefbff_0%,#fbfffb_48%,#f2f7ff_100%)] p-5 shadow-[0_16px_44px_-30px_rgba(30,91,116,0.38)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-sky-700" />
              <h1 className="text-2xl font-bold text-stone-800">Opportunities</h1>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
              MindWeave can surface competitions, partner resources, and organiser-led pathways that fit the themes you have been building through your journal. Nothing is shared automatically. Each access request is explicit, scoped, and revocable.
            </p>
          </div>

          <div className="grid min-w-[220px] gap-3 rounded-2xl border border-sky-100 bg-white/80 p-4 text-sm text-stone-700">
            <div className="flex items-center justify-between gap-3">
              <span>Entries analysed</span>
              <strong className="text-stone-900">{overview?.entryCount ?? 0}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Profile level</span>
              <strong className="text-stone-900">{overview?.level ?? 0}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Active shares</span>
              <strong className="text-stone-900">{sharedCount}</strong>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-sky-200/80 bg-white/80 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-stone-800">How this consent flow works</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm leading-6 text-stone-700 md:grid-cols-3">
          <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4">
            <p className="font-medium text-stone-900">1. MindWeave surfaces a fit</p>
            <p className="mt-1">Opportunities appear when your journal activity and recurring themes suggest a credible match.</p>
          </div>
          <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4">
            <p className="font-medium text-stone-900">2. You review every requested scope</p>
            <p className="mt-1">You can inspect exactly what data an organiser wants before granting any access.</p>
          </div>
          <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4">
            <p className="font-medium text-stone-900">3. You can revoke later</p>
            <p className="mt-1">Shared access stays visible in Settings so you can withdraw permission when you want.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {opportunities.map((opportunity) => (
          <Card
            key={opportunity.id}
            className="border-sky-200/80 bg-[linear-gradient(145deg,#ffffff_0%,#f9fdff_55%,#f4f9fb_100%)] shadow-[0_16px_34px_-30px_rgba(30,91,116,0.28)]"
          >
            <CardHeader className="space-y-3 pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg text-stone-900">{opportunity.title}</CardTitle>
                  <p className="mt-1 text-sm text-stone-600">{opportunity.organizerName}</p>
                </div>
                {opportunity.consent ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    <ShieldCheck className="h-3.5 w-3.5" /> Shared
                  </span>
                ) : opportunity.eligible ? (
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                    Unlocked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600">
                    <LockKeyhole className="h-3.5 w-3.5" /> Building fit
                  </span>
                )}
              </div>

              <p className="text-sm leading-6 text-stone-700">{opportunity.summary}</p>
            </CardHeader>

            <CardContent className="space-y-4 pb-5">
              <div className="flex flex-wrap gap-2">
                {opportunity.matchedTags.length > 0 ? (
                  opportunity.matchedTags.map((tag) => (
                    <Badge key={tag} variant="outline" className="border-sky-200 bg-white/80 text-stone-700">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-stone-500">Keep journaling to build clearer signals for this pathway.</p>
                )}
              </div>

              <div className="grid gap-3 text-sm text-stone-700 md:grid-cols-2">
                <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3">
                  <p className="font-medium text-stone-900">Requested data</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {opportunity.requestedScopes.map((scope) => (
                      <Badge key={scope} variant="outline" className="border-sky-200 bg-white/85 text-stone-700">
                        {scopeLabels[scope]}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3">
                  <p className="font-medium text-stone-900">Unlock signal</p>
                  <p className="mt-2 leading-6">
                    Requires at least {opportunity.minimumEntries} entries and profile level {opportunity.minimumLevel}.
                  </p>
                </div>
              </div>

              <Link to={`/opportunities/${opportunity.id}`}>
                <Button className="w-full justify-between bg-sky-700 text-white hover:bg-sky-800">
                  {opportunity.consent ? "Review shared access" : "Review access request"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}