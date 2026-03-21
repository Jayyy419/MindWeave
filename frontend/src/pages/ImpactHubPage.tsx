import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addOutreachTouchpoint,
  createOutreachCampaign,
  getFollowUpReminders,
  getImpactDashboard,
  getImpactProfile,
  getLearningEffectiveness,
  listAseanEvidence,
  listBeneficiaryGroups,
  listOutreachCampaigns,
  submitCampaignFunnelMetric,
  submitOutcomeSurvey,
  updateBeneficiaryGroup,
  type BeneficiaryGroup,
  type OutreachCampaign,
} from "@/services/api";
import { Loader2, Megaphone, Target, TrendingUp } from "lucide-react";

const LABELS: Record<BeneficiaryGroup, string> = {
  "secondary-students": "Secondary students",
  "polytechnic-students": "Polytechnic students",
  "university-students": "University students",
  "early-career-youth": "Early-career youth",
  "community-youth": "Community youth",
};

export function ImpactHubPage() {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSurvey, setSavingSurvey] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [savingTouchpointId, setSavingTouchpointId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [beneficiaryGroups, setBeneficiaryGroups] = useState<BeneficiaryGroup[]>([]);
  const [beneficiaryGroup, setBeneficiaryGroup] = useState<BeneficiaryGroup>("university-students");
  const [evidence, setEvidence] = useState<Array<{ id: string; title: string; detail: string; sourceLabel: string }>>([]);
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);

  const [dashboard, setDashboard] = useState<{
    totals: { entries: number; completedLessons: number; targetReach: number; currentReach: number };
    survey: {
      baseline: null | { stressScore: number; copingConfidenceScore: number; helpSeekingConfidenceScore: number };
      latestFollowUp: null | { stressScore: number; copingConfidenceScore: number; helpSeekingConfidenceScore: number };
      stressDelta: number | null;
      copingDelta: number | null;
      helpSeekingDelta: number | null;
    };
    funnel: {
      impressions: number;
      scans: number;
      signups: number;
      activeUsers: number;
      completions: number;
    };
    campaignProgressPercent: number;
  } | null>(null);

  const [followUpsDue, setFollowUpsDue] = useState<Array<{ surveyType: string; dueDate: string }>>([]);
  const [learningEffectiveness, setLearningEffectiveness] = useState<{
    attempts: number;
    averageScore: number;
    passRatePercent: number;
    pairedUsers: number;
    stressDelta: number;
    copingDelta: number;
    helpSeekingDelta: number;
    lessonCompletionSharePercent: number;
  } | null>(null);

  const [surveyType, setSurveyType] = useState<"baseline" | "day7" | "day14" | "day30">("baseline");
  const [surveyScores, setSurveyScores] = useState({
    stressScore: 6,
    copingConfidenceScore: 5,
    helpSeekingConfidenceScore: 5,
  });

  const [campaignForm, setCampaignForm] = useState({
    name: "",
    channel: "Campus workshop",
    targetReach: 100,
  });

  const [touchpointForm, setTouchpointForm] = useState<Record<string, { participantCount: number; sourceNote: string }>>({});

  async function refreshAll() {
    const [
      groupsResponse,
      profileResponse,
      evidenceResponse,
      campaignsResponse,
      dashboardResponse,
      followUpResponse,
      learningEffectivenessResponse,
    ] = await Promise.all([
      listBeneficiaryGroups(),
      getImpactProfile(),
      listAseanEvidence(),
      listOutreachCampaigns(),
      getImpactDashboard(),
      getFollowUpReminders(),
      getLearningEffectiveness(),
    ]);

    setBeneficiaryGroups(groupsResponse.groups);
    setBeneficiaryGroup(profileResponse.beneficiaryGroup);
    setEvidence(evidenceResponse.evidence);
    setCampaigns(campaignsResponse.campaigns);
    setDashboard(dashboardResponse);
    setFollowUpsDue(followUpResponse.due ?? []);
    setLearningEffectiveness(learningEffectivenessResponse);
  }

  useEffect(() => {
    refreshAll()
      .catch((err: Error) => setError(err.message || "Failed to load impact hub"))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpdateBeneficiary() {
    setSavingProfile(true);
    setError("");
    setSuccess("");
    try {
      await updateBeneficiaryGroup(beneficiaryGroup);
      await refreshAll();
      setSuccess("Beneficiary group updated.");
    } catch (err: any) {
      setError(err.message || "Failed to update beneficiary group");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSubmitSurvey() {
    setSavingSurvey(true);
    setError("");
    setSuccess("");
    try {
      await submitOutcomeSurvey({ surveyType, ...surveyScores });
      await refreshAll();
      setSuccess("Survey submitted. Impact deltas will update automatically.");
    } catch (err: any) {
      setError(err.message || "Failed to submit survey");
    } finally {
      setSavingSurvey(false);
    }
  }

  async function handleCreateCampaign() {
    setSavingCampaign(true);
    setError("");
    setSuccess("");
    try {
      await createOutreachCampaign(campaignForm);
      setCampaignForm({ name: "", channel: "Campus workshop", targetReach: 100 });
      await refreshAll();
      setSuccess("Outreach campaign created.");
    } catch (err: any) {
      setError(err.message || "Failed to create campaign");
    } finally {
      setSavingCampaign(false);
    }
  }

  async function handleAddTouchpoint(campaignId: string) {
    const data = touchpointForm[campaignId] ?? { participantCount: 10, sourceNote: "Workshop attendance" };
    setSavingTouchpointId(campaignId);
    setError("");
    setSuccess("");
    try {
      await addOutreachTouchpoint(campaignId, data);
      await refreshAll();
      setSuccess("Outreach touchpoint recorded.");
    } catch (err: any) {
      setError(err.message || "Failed to add touchpoint");
    } finally {
      setSavingTouchpointId(null);
    }
  }

  async function handleIncrementFunnel(
    campaignId: string,
    stage: "impressions" | "scans" | "signups" | "activeUsers" | "completions"
  ) {
    setError("");
    setSuccess("");
    try {
      await submitCampaignFunnelMetric(campaignId, { stage, count: 1 });
      await refreshAll();
      setSuccess(`Funnel metric updated for ${stage}.`);
    } catch (err: any) {
      setError(err.message || "Failed to update funnel metric");
    }
  }

  const totalCampaignReach = useMemo(
    () => campaigns.reduce((sum, campaign) => sum + campaign.currentReach, 0),
    [campaigns]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl border border-cyan-200/80 bg-[linear-gradient(145deg,#eff9ff_0%,#ffffff_45%,#eafcf5_100%)] p-5 shadow-[0_16px_44px_-30px_rgba(21,94,117,0.35)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-cyan-700" />
              <h1 className="text-2xl font-bold text-stone-800">Impact Hub</h1>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
              Track ASEAN relevance, beneficiary fit, outcome surveys, and outreach progress toward the 1,000 community awareness goal.
            </p>
          </div>
          <div className="rounded-xl border border-cyan-200 bg-white/80 px-4 py-3 text-sm text-stone-700">
            <p>
              Campaign reach: <span className="font-semibold text-stone-900">{totalCampaignReach}</span>
            </p>
            <p>
              Target progress: <span className="font-semibold text-stone-900">{dashboard?.campaignProgressPercent ?? 0}%</span>
            </p>
          </div>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
      {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</div> : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-cyan-200/80 bg-white/90 shadow-none">
          <CardHeader>
            <CardTitle className="text-base text-stone-800">ASEAN Problem Evidence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {evidence.map((item) => (
              <div key={item.id} className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-3">
                <p className="font-medium text-stone-900">{item.title}</p>
                <p className="mt-1 text-sm text-stone-700">{item.detail}</p>
                <Badge variant="outline" className="mt-2 border-cyan-200 bg-white text-cyan-700">
                  {item.sourceLabel}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-cyan-200/80 bg-white/90 shadow-none">
          <CardHeader>
            <CardTitle className="text-base text-stone-800">Beneficiary Segmentation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-stone-700">Choose your primary beneficiary segment for pilot impact reporting.</p>
            <select
              value={beneficiaryGroup}
              onChange={(event) => setBeneficiaryGroup(event.target.value as BeneficiaryGroup)}
              className="w-full rounded-lg border border-cyan-200 bg-white p-2.5 text-sm text-stone-800"
            >
              {beneficiaryGroups.map((group) => (
                <option key={group} value={group}>
                  {LABELS[group]}
                </option>
              ))}
            </select>
            <Button onClick={handleUpdateBeneficiary} disabled={savingProfile} className="bg-cyan-700 text-white hover:bg-cyan-800">
              {savingProfile ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              Save Beneficiary Group
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-emerald-200/80 bg-white/90 shadow-none">
          <CardHeader>
            <CardTitle className="text-base text-stone-800">Outcome Survey Tracker</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-stone-600">Survey type</label>
                <select
                  value={surveyType}
                  onChange={(event) => setSurveyType(event.target.value as "baseline" | "day7" | "day14" | "day30")}
                  className="w-full rounded-lg border border-emerald-200 bg-white p-2.5 text-sm text-stone-800"
                >
                  <option value="baseline">Baseline</option>
                  <option value="day7">Day 7</option>
                  <option value="day14">Day 14</option>
                  <option value="day30">Day 30</option>
                </select>
              </div>
            </div>

            {[
              ["stressScore", "Stress score"],
              ["copingConfidenceScore", "Coping confidence"],
              ["helpSeekingConfidenceScore", "Help-seeking confidence"],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-stone-600">{label}</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={surveyScores[key as keyof typeof surveyScores]}
                  onChange={(event) =>
                    setSurveyScores((prev) => ({
                      ...prev,
                      [key]: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-emerald-200 bg-white p-2.5 text-sm text-stone-800"
                />
              </div>
            ))}

            <Button onClick={handleSubmitSurvey} disabled={savingSurvey} className="bg-emerald-700 text-white hover:bg-emerald-800">
              {savingSurvey ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              Submit Survey
            </Button>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 text-sm text-stone-700">
              <p>Stress delta: {dashboard?.survey.stressDelta ?? "N/A"}</p>
              <p>Coping delta: {dashboard?.survey.copingDelta ?? "N/A"}</p>
              <p>Help-seeking delta: {dashboard?.survey.helpSeekingDelta ?? "N/A"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200/80 bg-white/90 shadow-none">
          <CardHeader>
            <CardTitle className="text-base text-stone-800">Impact Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-stone-700">
            <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
              <p>Entries completed: {dashboard?.totals.entries ?? 0}</p>
              <p>Lessons completed: {dashboard?.totals.completedLessons ?? 0}</p>
              <p>Outreach target: {dashboard?.totals.targetReach ?? 0}</p>
              <p>Outreach reached: {dashboard?.totals.currentReach ?? 0}</p>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
              <p className="font-medium text-stone-900">Follow-up reminders</p>
              {followUpsDue.length === 0 ? (
                <p className="mt-1 text-xs text-stone-700">No follow-up surveys currently due.</p>
              ) : (
                followUpsDue.map((item) => (
                  <p key={`${item.surveyType}-${item.dueDate}`} className="mt-1 text-xs text-stone-700">
                    {item.surveyType.toUpperCase()} due since {new Date(item.dueDate).toLocaleDateString()}
                  </p>
                ))
              )}
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
              <p className="font-medium text-stone-900">Learning effectiveness</p>
              <p className="mt-1 text-xs text-stone-700">Attempts: {learningEffectiveness?.attempts ?? 0}</p>
              <p className="text-xs text-stone-700">Avg score: {learningEffectiveness?.averageScore ?? 0}</p>
              <p className="text-xs text-stone-700">Pass rate: {learningEffectiveness?.passRatePercent ?? 0}%</p>
              <p className="text-xs text-stone-700">Paired users: {learningEffectiveness?.pairedUsers ?? 0}</p>
            </div>

            <p className="text-xs text-stone-600">
              This dashboard is designed for proposal evidence and pilot viability reporting.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-sky-200/80 bg-white/90 shadow-none">
        <CardHeader>
          <CardTitle className="text-base text-stone-800">Outreach Campaign Planner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={campaignForm.name}
              onChange={(event) => setCampaignForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Campaign name"
              className="rounded-lg border border-sky-200 bg-white p-2.5 text-sm text-stone-800"
            />
            <input
              value={campaignForm.channel}
              onChange={(event) => setCampaignForm((prev) => ({ ...prev, channel: event.target.value }))}
              placeholder="Channel (e.g., campus workshop)"
              className="rounded-lg border border-sky-200 bg-white p-2.5 text-sm text-stone-800"
            />
            <input
              type="number"
              min={1}
              value={campaignForm.targetReach}
              onChange={(event) => setCampaignForm((prev) => ({ ...prev, targetReach: Number(event.target.value) }))}
              placeholder="Target reach"
              className="rounded-lg border border-sky-200 bg-white p-2.5 text-sm text-stone-800"
            />
          </div>
          <Button onClick={handleCreateCampaign} disabled={savingCampaign} className="bg-sky-700 text-white hover:bg-sky-800">
            {savingCampaign ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
            <Megaphone className="mr-1 h-4 w-4" /> Create Campaign
          </Button>

          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-xl border border-sky-100 bg-sky-50/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-stone-900">{campaign.name}</p>
                  <Badge variant="outline" className="border-sky-200 bg-white text-sky-700">
                    <Target className="mr-1 h-3.5 w-3.5" /> {campaign.currentReach}/{campaign.targetReach}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-stone-700">Channel: {campaign.channel}</p>
                <p className="mt-1 break-all text-xs text-stone-600">QR link: {campaign.qrUrl}</p>
                <p className="mt-1 break-all text-xs text-stone-600">Referral link: {campaign.referralUrl}</p>

                <div className="mt-2 rounded-lg border border-sky-100 bg-white p-2 text-xs text-stone-700">
                  <p>Impressions: {campaign.funnelImpressions}</p>
                  <p>Scans: {campaign.funnelScans}</p>
                  <p>Signups: {campaign.funnelSignups}</p>
                  <p>Active users: {campaign.funnelActiveUsers}</p>
                  <p>Completions: {campaign.funnelCompletions}</p>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleIncrementFunnel(campaign.id, "impressions")}>+ Impression</Button>
                  <Button size="sm" variant="outline" onClick={() => handleIncrementFunnel(campaign.id, "scans")}>+ Scan</Button>
                  <Button size="sm" variant="outline" onClick={() => handleIncrementFunnel(campaign.id, "signups")}>+ Signup</Button>
                  <Button size="sm" variant="outline" onClick={() => handleIncrementFunnel(campaign.id, "activeUsers")}>+ Active</Button>
                  <Button size="sm" variant="outline" onClick={() => handleIncrementFunnel(campaign.id, "completions")}>+ Completion</Button>
                </div>

                <div className="mt-2 grid gap-2 md:grid-cols-[120px_1fr_auto]">
                  <input
                    type="number"
                    min={1}
                    value={touchpointForm[campaign.id]?.participantCount ?? 10}
                    onChange={(event) =>
                      setTouchpointForm((prev) => ({
                        ...prev,
                        [campaign.id]: {
                          participantCount: Number(event.target.value),
                          sourceNote: prev[campaign.id]?.sourceNote ?? "Workshop attendance",
                        },
                      }))
                    }
                    className="rounded-lg border border-sky-200 bg-white p-2 text-sm text-stone-800"
                  />
                  <input
                    value={touchpointForm[campaign.id]?.sourceNote ?? "Workshop attendance"}
                    onChange={(event) =>
                      setTouchpointForm((prev) => ({
                        ...prev,
                        [campaign.id]: {
                          participantCount: prev[campaign.id]?.participantCount ?? 10,
                          sourceNote: event.target.value,
                        },
                      }))
                    }
                    className="rounded-lg border border-sky-200 bg-white p-2 text-sm text-stone-800"
                  />
                  <Button
                    onClick={() => handleAddTouchpoint(campaign.id)}
                    disabled={savingTouchpointId === campaign.id}
                    className="bg-sky-700 text-white hover:bg-sky-800"
                  >
                    {savingTouchpointId === campaign.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                    Add
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
