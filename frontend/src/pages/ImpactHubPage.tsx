import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addOutreachTouchpoint,
  assignAbVariant,
  createAbTest,
  createOutreachCampaign,
  getAbTestSummary,
  getAiAuditSummary,
  getCostMonitoring,
  getEvidencePack,
  getFollowUpReminders,
  getImpactDashboard,
  getImpactProfile,
  getLearningEffectiveness,
  listAbTests,
  listAdminRoleAssignments,
  listAseanEvidence,
  listBeneficiaryGroups,
  listOutreachCampaigns,
  submitCampaignFunnelMetric,
  submitOutcomeSurvey,
  updateBeneficiaryGroup,
  upsertAdminRoleAssignment,
  type AbTestExperiment,
  type AdminRoleAssignmentRecord,
  type AiAuditSummary,
  type BeneficiaryGroup,
  type CostMonitoringSummary,
  type OutreachCampaign,
} from "@/services/api";
import {
  Bot,
  DollarSign,
  Download,
  FlaskConical,
  Loader2,
  Megaphone,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";

const LABELS: Record<BeneficiaryGroup, string> = {
  "secondary-students": "Secondary students",
  "polytechnic-students": "Polytechnic students",
  "university-students": "University students",
  "early-career-youth": "Early-career youth",
  "community-youth": "Community youth",
};

const ADMIN_SCOPES = ["impact.read", "impact.write", "impact.export", "campaign.manage", "governance.manage"];
const DEFAULT_VARIANTS = `control:60\nexpanded_copy:40`;

type AbSummary = {
  totals: { assignments: number; exposures: number };
  variants: Array<{ variantKey: string; assignmentCount: number; exposureCount: number }>;
};

export function ImpactHubPage() {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSurvey, setSavingSurvey] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [savingTouchpointId, setSavingTouchpointId] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState(false);
  const [savingAbTest, setSavingAbTest] = useState(false);
  const [assigningExperimentId, setAssigningExperimentId] = useState<string | null>(null);
  const [downloadingEvidence, setDownloadingEvidence] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [beneficiaryGroups, setBeneficiaryGroups] = useState<BeneficiaryGroup[]>([]);
  const [beneficiaryGroup, setBeneficiaryGroup] = useState<BeneficiaryGroup>("university-students");
  const [evidence, setEvidence] = useState<Array<{ id: string; title: string; detail: string; sourceLabel: string }>>([]);
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [roleAssignments, setRoleAssignments] = useState<AdminRoleAssignmentRecord[]>([]);
  const [abExperiments, setAbExperiments] = useState<AbTestExperiment[]>([]);
  const [abSummaryByExperiment, setAbSummaryByExperiment] = useState<Record<string, AbSummary>>({});
  const [aiAuditSummary, setAiAuditSummary] = useState<AiAuditSummary | null>(null);
  const [costMonitoring, setCostMonitoring] = useState<CostMonitoringSummary | null>(null);
  const [lastEvidenceExportAt, setLastEvidenceExportAt] = useState<string | null>(null);

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

  const [roleForm, setRoleForm] = useState({
    userId: "",
    role: "admin",
    scope: "impact.read",
  });

  const [abTestForm, setAbTestForm] = useState({
    name: "",
    channel: "impact-hub",
    status: "active" as "active" | "paused" | "completed",
    variantsText: DEFAULT_VARIANTS,
  });

  const [abSubjectByExperiment, setAbSubjectByExperiment] = useState<Record<string, string>>({});

  function parseVariantLines(text: string): Array<{ key: string; weight: number }> {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [rawKey, rawWeight] = line.split(":");
        const key = String(rawKey || "").trim();
        const weight = Math.max(1, Number(rawWeight || 1));
        return { key, weight };
      })
      .filter((item) => item.key.length > 0);
  }

  async function refreshAll() {
    const [
      groupsResponse,
      profileResponse,
      evidenceResponse,
      campaignsResponse,
      dashboardResponse,
      followUpResponse,
      learningEffectivenessResponse,
      rolesResponse,
      abTestsResponse,
      aiAuditResponse,
      costResponse,
    ] = await Promise.all([
      listBeneficiaryGroups(),
      getImpactProfile(),
      listAseanEvidence(),
      listOutreachCampaigns(),
      getImpactDashboard(),
      getFollowUpReminders(),
      getLearningEffectiveness(),
      listAdminRoleAssignments(),
      listAbTests(),
      getAiAuditSummary(),
      getCostMonitoring(),
    ]);

    setBeneficiaryGroups(groupsResponse.groups);
    setBeneficiaryGroup(profileResponse.beneficiaryGroup);
    setEvidence(evidenceResponse.evidence);
    setCampaigns(campaignsResponse.campaigns);
    setDashboard(dashboardResponse);
    setFollowUpsDue(followUpResponse.due ?? []);
    setLearningEffectiveness(learningEffectivenessResponse);
    setRoleAssignments(rolesResponse.roles ?? []);
    setAbExperiments(abTestsResponse.experiments ?? []);
    setAiAuditSummary(aiAuditResponse);
    setCostMonitoring(costResponse);

    const summaries = await Promise.all(
      (abTestsResponse.experiments ?? []).map(async (experiment) => {
        const summary = await getAbTestSummary(experiment.id);
        return [experiment.id, { totals: summary.totals, variants: summary.variants }] as const;
      })
    );
    setAbSummaryByExperiment(Object.fromEntries(summaries));
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

  async function handleAssignRole() {
    if (!roleForm.userId.trim()) {
      setError("User ID is required for role assignment");
      return;
    }

    setSavingRole(true);
    setError("");
    setSuccess("");
    try {
      await upsertAdminRoleAssignment({
        userId: roleForm.userId.trim(),
        role: roleForm.role.trim().toLowerCase(),
        scope: roleForm.scope,
      });
      await refreshAll();
      setSuccess("RBAC role assignment updated.");
    } catch (err: any) {
      setError(err.message || "Failed to assign RBAC role");
    } finally {
      setSavingRole(false);
    }
  }

  async function handleCreateAbTest() {
    const variants = parseVariantLines(abTestForm.variantsText);
    if (!abTestForm.name.trim()) {
      setError("A/B test name is required");
      return;
    }

    if (variants.length === 0) {
      setError("Provide at least one variant line using key:weight");
      return;
    }

    setSavingAbTest(true);
    setError("");
    setSuccess("");
    try {
      await createAbTest({
        name: abTestForm.name.trim(),
        channel: abTestForm.channel.trim() || "impact-hub",
        status: abTestForm.status,
        variants,
      });
      setAbTestForm((prev) => ({ ...prev, name: "" }));
      await refreshAll();
      setSuccess("A/B experiment created.");
    } catch (err: any) {
      setError(err.message || "Failed to create A/B test");
    } finally {
      setSavingAbTest(false);
    }
  }

  async function handleAssignVariant(experimentId: string) {
    const subjectKey = (abSubjectByExperiment[experimentId] || "").trim();
    if (!subjectKey) {
      setError("Subject key is required to assign A/B variant");
      return;
    }

    setAssigningExperimentId(experimentId);
    setError("");
    setSuccess("");
    try {
      const assignment = await assignAbVariant(experimentId, subjectKey);
      const summary = await getAbTestSummary(experimentId);
      setAbSummaryByExperiment((prev) => ({
        ...prev,
        [experimentId]: { totals: summary.totals, variants: summary.variants },
      }));
      setSuccess(`Variant '${assignment.variant}' assigned${assignment.isNew ? "" : " (existing assignment reused)"}.`);
    } catch (err: any) {
      setError(err.message || "Failed to assign variant");
    } finally {
      setAssigningExperimentId(null);
    }
  }

  async function handleDownloadEvidencePack() {
    setDownloadingEvidence(true);
    setError("");
    setSuccess("");
    try {
      const pack = await getEvidencePack();
      const blob = new Blob([pack.export.kpiCsv], { type: "text/csv;charset=utf-8" });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `mindweave-evidence-pack-${new Date(pack.generatedAt).toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(objectUrl);
      setLastEvidenceExportAt(pack.generatedAt);
      setSuccess("Evidence pack exported as CSV.");
    } catch (err: any) {
      setError(err.message || "Failed to export evidence pack");
    } finally {
      setDownloadingEvidence(false);
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

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="border-violet-200/80 bg-white/90 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-stone-800">
              <ShieldCheck className="h-4 w-4 text-violet-700" /> RBAC Governance Roles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-3">
              <input
                value={roleForm.userId}
                onChange={(event) => setRoleForm((prev) => ({ ...prev, userId: event.target.value }))}
                placeholder="User ID"
                className="rounded-lg border border-violet-200 bg-white p-2.5 text-sm text-stone-800"
              />
              <input
                value={roleForm.role}
                onChange={(event) => setRoleForm((prev) => ({ ...prev, role: event.target.value }))}
                placeholder="Role (e.g., analyst)"
                className="rounded-lg border border-violet-200 bg-white p-2.5 text-sm text-stone-800"
              />
              <select
                value={roleForm.scope}
                onChange={(event) => setRoleForm((prev) => ({ ...prev, scope: event.target.value }))}
                className="rounded-lg border border-violet-200 bg-white p-2.5 text-sm text-stone-800"
              >
                {ADMIN_SCOPES.map((scope) => (
                  <option key={scope} value={scope}>
                    {scope}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={handleAssignRole} disabled={savingRole} className="bg-violet-700 text-white hover:bg-violet-800">
              {savingRole ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              Upsert Role Assignment
            </Button>

            <div className="max-h-60 space-y-2 overflow-auto rounded-xl border border-violet-100 bg-violet-50/40 p-3 text-xs text-stone-700">
              {roleAssignments.length === 0 ? (
                <p>No explicit scope assignments yet.</p>
              ) : (
                roleAssignments.slice(0, 20).map((role) => (
                  <div key={role.id} className="rounded-lg border border-violet-100 bg-white p-2">
                    <p className="font-medium text-stone-900">{role.username || role.email || role.userId}</p>
                    <p>role: {role.role}</p>
                    <p>scope: {role.scope}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-indigo-200/80 bg-white/90 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-stone-800">
              <FlaskConical className="h-4 w-4 text-indigo-700" /> A/B Experiment Ops
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-3">
              <input
                value={abTestForm.name}
                onChange={(event) => setAbTestForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Experiment name"
                className="rounded-lg border border-indigo-200 bg-white p-2.5 text-sm text-stone-800"
              />
              <input
                value={abTestForm.channel}
                onChange={(event) => setAbTestForm((prev) => ({ ...prev, channel: event.target.value }))}
                placeholder="Channel"
                className="rounded-lg border border-indigo-200 bg-white p-2.5 text-sm text-stone-800"
              />
              <select
                value={abTestForm.status}
                onChange={(event) =>
                  setAbTestForm((prev) => ({ ...prev, status: event.target.value as "active" | "paused" | "completed" }))
                }
                className="rounded-lg border border-indigo-200 bg-white p-2.5 text-sm text-stone-800"
              >
                <option value="active">active</option>
                <option value="paused">paused</option>
                <option value="completed">completed</option>
              </select>
            </div>

            <textarea
              value={abTestForm.variantsText}
              onChange={(event) => setAbTestForm((prev) => ({ ...prev, variantsText: event.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-indigo-200 bg-white p-2.5 text-xs text-stone-800"
            />
            <p className="text-xs text-stone-600">Variants format: one per line, key:weight (example: control:60).</p>

            <Button onClick={handleCreateAbTest} disabled={savingAbTest} className="bg-indigo-700 text-white hover:bg-indigo-800">
              {savingAbTest ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              Create Experiment
            </Button>

            <div className="max-h-72 space-y-2 overflow-auto rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 text-xs text-stone-700">
              {abExperiments.length === 0 ? (
                <p>No A/B experiments yet.</p>
              ) : (
                abExperiments.map((experiment) => {
                  const summary = abSummaryByExperiment[experiment.id];
                  return (
                    <div key={experiment.id} className="rounded-lg border border-indigo-100 bg-white p-2">
                      <p className="font-medium text-stone-900">{experiment.name}</p>
                      <p>channel: {experiment.channel}</p>
                      <p>status: {experiment.status}</p>
                      <p>
                        totals: {summary?.totals.assignments ?? 0} assignments / {summary?.totals.exposures ?? 0} exposures
                      </p>
                      <p className="mt-1 text-[11px] text-stone-600">
                        variants: {experiment.variants.map((variant) => `${variant.key} (${variant.weight})`).join(", ")}
                      </p>
                      <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto]">
                        <input
                          value={abSubjectByExperiment[experiment.id] ?? ""}
                          onChange={(event) =>
                            setAbSubjectByExperiment((prev) => ({ ...prev, [experiment.id]: event.target.value }))
                          }
                          placeholder="subjectKey (e.g., user-id)"
                          className="rounded-lg border border-indigo-200 bg-white p-2 text-xs text-stone-800"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAssignVariant(experiment.id)}
                          disabled={assigningExperimentId === experiment.id}
                          className="bg-indigo-700 text-white hover:bg-indigo-800"
                        >
                          {assigningExperimentId === experiment.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                          Assign
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="border-rose-200/80 bg-white/90 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-stone-800">
              <Bot className="h-4 w-4 text-rose-700" /> AI Governance Audit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-stone-700">
            <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
              <p>Total AI calls: {aiAuditSummary?.totals.totalCalls ?? 0}</p>
              <p>Successful calls: {aiAuditSummary?.totals.successCalls ?? 0}</p>
              <p>Flagged outcomes: {aiAuditSummary?.totals.flaggedCalls ?? 0}</p>
              <p>Estimated tokens: {aiAuditSummary?.totals.totalEstimatedTokens ?? 0}</p>
            </div>
            <div className="max-h-52 space-y-1 overflow-auto rounded-xl border border-rose-100 bg-white p-3 text-xs text-stone-700">
              {(aiAuditSummary?.byRoute ?? []).length === 0 ? (
                <p>No route-level AI audit data yet.</p>
              ) : (
                aiAuditSummary?.byRoute.map((item) => (
                  <p key={item.route}>
                    {item.route}: {item.successCount}/{item.count} success
                  </p>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-lime-200/80 bg-white/90 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-stone-800">
              <DollarSign className="h-4 w-4 text-lime-700" /> Cost Monitoring And Evidence Export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-stone-700">
            <div className="rounded-xl border border-lime-100 bg-lime-50/40 p-3">
              <p>Total estimated cost: ${Number(costMonitoring?.totals.totalCostUsd ?? 0).toFixed(4)}</p>
              <p>Input tokens: {costMonitoring?.totals.totalInputTokens ?? 0}</p>
              <p>Output tokens: {costMonitoring?.totals.totalOutputTokens ?? 0}</p>
              <p>30d active users: {costMonitoring?.activeUsers30d ?? 0}</p>
              <p>Cost per 30d active user: ${Number(costMonitoring?.totals.costPerActiveUser30d ?? 0).toFixed(4)}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-lime-100 bg-white p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-stone-600">Monthly</p>
                {(costMonitoring?.monthly ?? []).length === 0 ? (
                  <p className="text-xs text-stone-600">No monthly cost rows yet.</p>
                ) : (
                  costMonitoring?.monthly.map((row) => (
                    <p key={row.month} className="text-xs text-stone-700">
                      {new Date(row.month).toLocaleDateString(undefined, { month: "short", year: "numeric" })}: ${Number(row.costUsd).toFixed(4)}
                    </p>
                  ))
                )}
              </div>
              <div className="rounded-xl border border-lime-100 bg-white p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-stone-600">By category</p>
                {(costMonitoring?.byCategory ?? []).length === 0 ? (
                  <p className="text-xs text-stone-600">No category breakdown yet.</p>
                ) : (
                  costMonitoring?.byCategory.map((row) => (
                    <p key={row.category} className="text-xs text-stone-700">
                      {row.category}: ${Number(row.costUsd).toFixed(4)}
                    </p>
                  ))
                )}
              </div>
            </div>

            <Button
              onClick={handleDownloadEvidencePack}
              disabled={downloadingEvidence}
              className="bg-lime-700 text-white hover:bg-lime-800"
            >
              {downloadingEvidence ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
              Download Evidence CSV
            </Button>
            <p className="text-xs text-stone-600">
              Last export: {lastEvidenceExportAt ? new Date(lastEvidenceExportAt).toLocaleString() : "Not exported yet"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
