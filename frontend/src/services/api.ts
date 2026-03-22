/**
 * API service layer for MindWeave frontend.
 * Authenticated requests include JWT token in Authorization header.
 * The Vite dev server proxies /api requests to the backend at localhost:3001.
 */

const API_BASE = "/api";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || API_BASE;

const TOKEN_KEY = "mindweave-auth-token";

function getAuthToken(): string {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function headers(): HeadersInit {
  const token = getAuthToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type AuthResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
    isAdmin?: boolean;
  };
};

export interface UsernameAvailabilityResponse {
  available: boolean;
}

export async function register(data: {
  email: string;
  username: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to register");
  }
  return res.json();
}

export async function checkUsernameAvailability(username: string): Promise<UsernameAvailabilityResponse> {
  const res = await fetch(
    `${API_BASE_URL}/auth/username-available?username=${encodeURIComponent(username.trim())}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to check username");
  }
  return res.json();
}

export async function login(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to login");
  }
  return res.json();
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to request password reset");
  }

  return res.json();
}

export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to reset password");
  }

  return res.json();
}

// ── Entry Types ──

export interface EntryPreview {
  id: string;
  title: string;
  framework: string;
  preview: string;
  createdAt: string;
}

export interface EntryChunk {
  id: string;
  userText: string;
  aiText: string;
}

export interface EntryDetail {
  id: string;
  title: string;
  framework: string;
  originalText: string;
  reframedText: string;
  chunks: EntryChunk[];
  tags: string[];
  createdAt: string;
  explainability?: ExplainabilityPayload;
  safety?: SafetySignal;
}

export type TherapeuticFrameworkId = "cbt" | "iceberg" | "growth";

export type CulturalFrameworkId =
  | "singapore"
  | "indonesia"
  | "malaysia"
  | "thailand"
  | "philippines"
  | "vietnam"
  | "brunei"
  | "cambodia"
  | "laos"
  | "myanmar";

export type FrameworkId =
  | "cbt"
  | "iceberg"
  | "growth"
  | "singapore"
  | "indonesia"
  | "malaysia"
  | "thailand"
  | "philippines"
  | "vietnam"
  | "brunei"
  | "cambodia"
  | "laos"
  | "myanmar";

export type CulturalToneStrength = "light" | "medium" | "strong";

export interface ReframeRequest {
  text: string;
  framework: TherapeuticFrameworkId | FrameworkId;
  culturalFramework?: CulturalFrameworkId;
  culturalToneStrength?: CulturalToneStrength;
}

export interface CreateEntryRequest extends ReframeRequest {
  title: string;
  chunks?: EntryChunk[];
}

export interface LearningFrameworkSummary {
  id: TherapeuticFrameworkId;
  label: string;
  description: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
}

export interface LearningReadingPage {
  heading: string;
  body: string[];
}

export interface LearningQuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LearningGameRound {
  id: string;
  scenario: string;
  options: string[];
  correctIndex: number;
  feedback: string;
}

export type LearningCourseStep =
  | {
      id: string;
      type: "reading";
      title: string;
      pages: LearningReadingPage[];
    }
  | {
      id: string;
      type: "reflection";
      title: string;
      instructions: string;
      prompts: string[];
      minWords: number;
    }
  | {
      id: string;
      type: "quiz";
      title: string;
      passingScore: number;
      questions: LearningQuizQuestion[];
    }
  | {
      id: string;
      type: "game";
      title: string;
      instructions: string;
      passingScore: number;
      rounds: LearningGameRound[];
    };

export interface LearningLesson {
  id: string;
  title: string;
  summary: string;
  durationMinutes: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  objectives: string[];
  course: LearningCourseStep[];
  completed: boolean;
  completedAt: string | null;
}

export interface LearningFrameworkDetail {
  id: TherapeuticFrameworkId;
  label: string;
  description: string;
  totalLessons: number;
  completedLessons: number;
  lessons: LearningLesson[];
}

export interface SafetyResource {
  label: string;
  contact: string;
  type: "hotline" | "ngo";
}

export interface SafetySignal {
  level: "none" | "high";
  reasons: string[];
  message: string | null;
  supportCountry: string;
  supportResources: SafetyResource[];
}

export interface ExplainabilityPayload {
  framework: FrameworkId;
  culturalFramework: CulturalFrameworkId | null;
  culturalToneStrength: CulturalToneStrength | null;
  steps: string[];
}

export interface ReframePreviewResponse {
  originalText: string;
  reframedText: string;
  framework: FrameworkId;
  source?: "ai";
  explainability?: ExplainabilityPayload;
  safety?: SafetySignal;
}

export interface AseanEvidenceItem {
  id: string;
  title: string;
  detail: string;
  sourceLabel: string;
}

export type BeneficiaryGroup =
  | "secondary-students"
  | "polytechnic-students"
  | "university-students"
  | "early-career-youth"
  | "community-youth";

export interface OutcomeSurveyRecord {
  id: string;
  surveyType: "baseline" | "day7" | "day14" | "day30";
  stressScore: number;
  copingConfidenceScore: number;
  helpSeekingConfidenceScore: number;
  createdAt: string;
}

export interface ImpactProfileResponse {
  beneficiaryGroup: BeneficiaryGroup;
  updatedAt: string | null;
  baselineSurvey: OutcomeSurveyRecord | null;
  followUpSurveys: OutcomeSurveyRecord[];
}

export interface OutreachCampaign {
  id: string;
  name: string;
  channel: string;
  targetReach: number;
  currentReach: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  qrToken: string;
  referralCode: string;
  qrUrl: string;
  referralUrl: string;
  funnelImpressions: number;
  funnelScans: number;
  funnelSignups: number;
  funnelActiveUsers: number;
  funnelCompletions: number;
}

export interface ImpactDashboard {
  totals: {
    entries: number;
    completedLessons: number;
    targetReach: number;
    currentReach: number;
  };
  survey: {
    baseline: OutcomeSurveyRecord | null;
    latestFollowUp: OutcomeSurveyRecord | null;
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
}

export interface FollowUpRemindersResponse {
  baselineCompleted: boolean;
  baselineDate?: string;
  due: Array<{
    surveyType: "day7" | "day14" | "day30";
    dueDate: string;
  }>;
}

export interface LearningEffectivenessMetrics {
  attempts: number;
  averageScore: number;
  passRatePercent: number;
  pairedUsers: number;
  stressDelta: number;
  copingDelta: number;
  helpSeekingDelta: number;
  lessonCompletionSharePercent: number;
}

export interface AdminRoleAssignmentRecord {
  id: string;
  userId: string;
  role: string;
  scope: string;
  assignedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  email: string | null;
  username: string | null;
}

export interface AbVariant {
  key: string;
  weight: number;
  message?: string;
}

export interface AbTestExperiment {
  id: string;
  name: string;
  channel: string;
  status: "active" | "paused" | "completed";
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  variants: AbVariant[];
}

export interface AiAuditSummary {
  totals: {
    totalCalls: number;
    successCalls: number;
    flaggedCalls: number;
    totalEstimatedTokens: number;
  };
  byRoute: Array<{
    route: string;
    count: number;
    successCount: number;
  }>;
}

export interface CostMonitoringSummary {
  totals: {
    totalCostUsd: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    costPerActiveUser30d: number;
  };
  activeUsers30d: number;
  monthly: Array<{
    month: string;
    costUsd: number;
  }>;
  byCategory: Array<{
    category: string;
    costUsd: number;
  }>;
}

export interface EvidencePackResponse {
  generatedAt: string;
  kpiSummary: {
    generatedAt: string;
    learning: {
      attempts: number;
      averageScore: number;
      passRatePercent: number;
    };
    campaigns: {
      campaignCount: number;
      targetReach: number;
      currentReach: number;
      funnelImpressions: number;
      funnelScans: number;
      funnelSignups: number;
      funnelActiveUsers: number;
      funnelCompletions: number;
    };
    ai: {
      totalCalls: number;
      successCalls: number;
      flaggedCalls: number;
    };
    costs: {
      totalCostUsd: number;
    };
  };
  export: {
    kpiCsv: string;
  };
}

// ── Profile Types ──

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
  level: number;
  badges: string[];
  tags: string[];
  entryCount: number;
  createdAt: string;
}

export interface AdminUserRecord {
  id: string;
  email: string | null;
  username: string | null;
  isAdmin: boolean;
  level: number;
  entryCount: number;
  createdAt: string;
}

// ── Think Tank Types ──

export interface ThinkTankPreview {
  id: string;
  name: string;
  description: string;
  tags: string[];
  maxMembers: number;
  memberCount: number;
  isFull?: boolean;
  isJoined?: boolean;
}

export interface ThinkTankDetail {
  id: string;
  name: string;
  description: string;
  tags: string[];
  maxMembers: number;
  members: {
    userId: string;
    username: string;
    level: number;
    joinedAt: string;
  }[];
  isJoined: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  usernameSnapshot: string;
  content: string;
  createdAt: string;
}

// ── Opportunity & Consent Types ──

export type AccessScope =
  | "profileBasics"
  | "interestProfile"
  | "reflectionSummary"
  | "selectedJournalExcerpts"
  | "fullJournalAccess";

export interface OpportunityConsent {
  id: string;
  status: string;
  scopes: AccessScope[];
  grantedAt: string;
  expiresAt: string | null;
}

export interface OpportunitySummary {
  id: string;
  slug: string;
  title: string;
  organizerName: string;
  summary: string;
  description: string;
  benefits: string[];
  resourceHighlights: string[];
  requestedScopes: AccessScope[];
  eligible: boolean;
  matchedTags: string[];
  minimumEntries: number;
  minimumLevel: number;
  consent: OpportunityConsent | null;
}

export interface OpportunityDetail extends OpportunitySummary {}

export interface OpportunityAccessPreview {
  opportunityId: string;
  scopes: AccessScope[];
  accessPackage: Record<string, unknown> | null;
}

export interface UserConsentRecord {
  id: string;
  status: string;
  scopes: AccessScope[];
  purposeSnapshot: string;
  organizerSnapshot: string;
  expiresAt: string | null;
  grantedAt: string;
  revokedAt: string | null;
  opportunity: {
    id: string;
    slug: string;
    title: string;
    organizerName: string;
    summary: string;
  };
}

// ── API Functions ──

/** Create a new journal entry with AI reframing */
export async function createEntry(data: CreateEntryRequest): Promise<EntryDetail> {
  const res = await fetch(`${API_BASE_URL}/entries`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create entry");
  }
  return res.json();
}

/** Generate a live reframing preview without saving an entry */
export async function previewReframe(data: ReframeRequest): Promise<ReframePreviewResponse> {
  const res = await fetch(`${API_BASE_URL}/entries/reframe-preview`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to generate live preview");
  }
  return res.json();
}

/** List all journal entries for the current user */
export async function listEntries(): Promise<EntryPreview[]> {
  const res = await fetch(`${API_BASE_URL}/entries`, { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch entries");
  return res.json();
}

/** Get a single journal entry by ID */
export async function getEntry(id: string): Promise<EntryDetail> {
  const res = await fetch(`${API_BASE_URL}/entries/${encodeURIComponent(id)}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error("Failed to fetch entry");
  return res.json();
}

/** Delete a single journal entry by ID */
export async function deleteEntry(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/entries/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete entry");
  }
}

/** Delete multiple journal entries by IDs */
export async function deleteEntries(ids: string[]): Promise<{ deletedCount: number }> {
  const res = await fetch(`${API_BASE_URL}/entries`, {
    method: "DELETE",
    headers: headers(),
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete selected entries");
  }
  return res.json();
}

/** Get the current user's profile */
export async function getProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_BASE_URL}/user/profile`, { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export async function checkUsernameAvailabilityForUser(
  username: string
): Promise<UsernameAvailabilityResponse> {
  const res = await fetch(
    `${API_BASE_URL}/user/username-available?username=${encodeURIComponent(username.trim())}`,
    { headers: headers() }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to check username availability");
  }
  return res.json();
}

export async function updateUsername(
  username: string
): Promise<{ message: string; user: { id: string; email: string; username: string; isAdmin: boolean } }> {
  const res = await fetch(`${API_BASE_URL}/user/username`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update username");
  }
  return res.json();
}

export async function sendEmailChangeOtp(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/user/email-otp/send`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to send verification code");
  }
  return res.json();
}

export async function verifyEmailChangeOtp(data: {
  email: string;
  otp: string;
}): Promise<{ message: string; user: { id: string; email: string; username: string; isAdmin: boolean } }> {
  const res = await fetch(`${API_BASE_URL}/user/email-otp/verify`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to verify email code");
  }
  return res.json();
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
  repeatNewPassword: string;
}): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/user/password`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to change password");
  }
  return res.json();
}

export async function listAdminUsers(query = ""): Promise<{ users: AdminUserRecord[] }> {
  const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
  const res = await fetch(`${API_BASE_URL}/user/admin/users${suffix}`, { headers: headers() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load users");
  }
  return res.json();
}

export async function updateAdminUserRole(
  userId: string,
  isAdmin: boolean
): Promise<{ message: string; user: AdminUserRecord }> {
  const res = await fetch(`${API_BASE_URL}/user/admin/users/${encodeURIComponent(userId)}/admin`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ isAdmin }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update admin access");
  }
  return res.json();
}

/** List all think tanks */
export async function listThinkTanks(): Promise<ThinkTankPreview[]> {
  const res = await fetch(`${API_BASE_URL}/thinktanks`, { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch think tanks");
  return res.json();
}

/** List think tanks available to the current user based on tags */
export async function listAvailableThinkTanks(): Promise<{
  message?: string;
  available: ThinkTankPreview[];
}> {
  const res = await fetch(`${API_BASE_URL}/thinktanks/available`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error("Failed to fetch available think tanks");
  return res.json();
}

/** Get details of a single think tank */
export async function getThinkTank(id: string): Promise<ThinkTankDetail> {
  const res = await fetch(`${API_BASE_URL}/thinktanks/${encodeURIComponent(id)}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error("Failed to fetch think tank");
  return res.json();
}

/** Join a think tank */
export async function joinThinkTank(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/thinktanks/${encodeURIComponent(id)}/join`, {
    method: "POST",
    headers: headers(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to join think tank");
  }
}

export async function listThinkTankMessages(id: string): Promise<ChatMessage[]> {
  const res = await fetch(`${API_BASE_URL}/thinktanks/${encodeURIComponent(id)}/messages`, {
    headers: headers(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch messages");
  }
  return res.json();
}

export async function sendThinkTankMessage(id: string, content: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/thinktanks/${encodeURIComponent(id)}/messages`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to send message");
  }
}

export async function listOpportunities(): Promise<{
  opportunities: OpportunitySummary[];
  overview: {
    entryCount: number;
    level: number;
    userTags: string[];
  };
}> {
  const res = await fetch(`${API_BASE_URL}/opportunities`, { headers: headers() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch opportunities");
  }
  return res.json();
}

export async function getOpportunity(id: string): Promise<OpportunityDetail> {
  const res = await fetch(`${API_BASE_URL}/opportunities/${encodeURIComponent(id)}`, {
    headers: headers(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch opportunity");
  }
  return res.json();
}

export async function previewOpportunityAccess(
  id: string,
  scopes: AccessScope[]
): Promise<OpportunityAccessPreview> {
  const query = new URLSearchParams();
  scopes.forEach((scope) => query.append("scope", scope));

  const res = await fetch(
    `${API_BASE_URL}/opportunities/${encodeURIComponent(id)}/access-preview?${query.toString()}`,
    { headers: headers() }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to generate access preview");
  }
  return res.json();
}

export async function grantOpportunityConsent(data: {
  opportunityId: string;
  scopes: AccessScope[];
  expiresAt: string | null;
}): Promise<OpportunityConsent> {
  const res = await fetch(`${API_BASE_URL}/opportunities/${encodeURIComponent(data.opportunityId)}/consent`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ scopes: data.scopes, expiresAt: data.expiresAt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to save consent");
  }
  return res.json();
}

export async function listUserConsents(): Promise<UserConsentRecord[]> {
  const res = await fetch(`${API_BASE_URL}/user/consents`, { headers: headers() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch shared access records");
  }
  return res.json();
}

export async function revokeConsent(id: string): Promise<{ id: string; status: string; revokedAt: string | null }> {
  const res = await fetch(`${API_BASE_URL}/user/consents/${encodeURIComponent(id)}/revoke`, {
    method: "POST",
    headers: headers(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to revoke consent");
  }
  return res.json();
}

export async function listLearningFrameworks(): Promise<{ frameworks: LearningFrameworkSummary[] }> {
  const res = await fetch(`${API_BASE_URL}/learning/frameworks`, { headers: headers() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load learning frameworks");
  }
  return res.json();
}

export async function getLearningFramework(id: TherapeuticFrameworkId): Promise<LearningFrameworkDetail> {
  const res = await fetch(`${API_BASE_URL}/learning/frameworks/${encodeURIComponent(id)}`, {
    headers: headers(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load framework lessons");
  }
  return res.json();
}

export async function completeLesson(id: string): Promise<{
  lessonId: string;
  frameworkId: TherapeuticFrameworkId;
  completedAt: string;
  message: string;
}> {
  const res = await fetch(`${API_BASE_URL}/learning/lessons/${encodeURIComponent(id)}/complete`, {
    method: "POST",
    headers: headers(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to complete lesson");
  }
  return res.json();
}

export async function submitLearningAssessment(
  lessonId: string,
  data: { source: string; score: number; passed: boolean }
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/learning/lessons/${encodeURIComponent(lessonId)}/assessment`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to submit learning assessment");
  }
  return res.json();
}

export async function listSupportResources(culturalFramework?: string): Promise<{
  supportCountry: string;
  supportResources: SafetyResource[];
}> {
  const suffix = culturalFramework
    ? `?culturalFramework=${encodeURIComponent(culturalFramework)}`
    : "";
  const res = await fetch(`${API_BASE_URL}/entries/support-resources${suffix}`, {
    headers: headers(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load support resources");
  }
  return res.json();
}

export async function listAseanEvidence(): Promise<{ evidence: AseanEvidenceItem[] }> {
  const res = await fetch(`${API_BASE_URL}/impact/asean-evidence`, { headers: headers() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load ASEAN evidence");
  }
  return res.json();
}

export async function listBeneficiaryGroups(): Promise<{ groups: BeneficiaryGroup[] }> {
  const res = await fetch(`${API_BASE_URL}/impact/beneficiary-groups`, { headers: headers() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load beneficiary groups");
  }
  return res.json();
}

export async function getImpactProfile(): Promise<ImpactProfileResponse> {
  const res = await fetch(`${API_BASE_URL}/impact/profile`, { headers: headers() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load impact profile");
  }
  return res.json();
}

export async function updateBeneficiaryGroup(beneficiaryGroup: BeneficiaryGroup): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/impact/profile`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ beneficiaryGroup }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update beneficiary group");
  }
  return res.json();
}

export async function submitOutcomeSurvey(data: {
  surveyType: "baseline" | "day7" | "day14" | "day30";
  stressScore: number;
  copingConfidenceScore: number;
  helpSeekingConfidenceScore: number;
}): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/impact/survey`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to submit survey");
  }
  return res.json();
}

export async function listOutreachCampaigns(): Promise<{ campaigns: OutreachCampaign[] }> {
  const res = await fetch(`${API_BASE_URL}/impact/campaigns`, { headers: headers() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load outreach campaigns");
  }
  return res.json();
}

export async function createOutreachCampaign(data: {
  name: string;
  channel: string;
  targetReach: number;
}): Promise<OutreachCampaign> {
  const res = await fetch(`${API_BASE_URL}/impact/campaigns`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create outreach campaign");
  }
  return res.json();
}

export async function addOutreachTouchpoint(
  campaignId: string,
  data: { participantCount: number; sourceNote: string }
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/impact/campaigns/${encodeURIComponent(campaignId)}/touchpoints`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to add outreach touchpoint");
  }
  return res.json();
}

export async function submitCampaignFunnelMetric(
  campaignId: string,
  data: { stage: "impressions" | "scans" | "signups" | "activeUsers" | "completions"; count: number }
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/impact/campaigns/${encodeURIComponent(campaignId)}/funnel`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update campaign funnel metric");
  }
  return res.json();
}

export async function getFollowUpReminders(): Promise<FollowUpRemindersResponse> {
  const res = await fetch(`${API_BASE_URL}/impact/follow-up-reminders`, { headers: headers() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load follow-up reminders");
  }
  return res.json();
}

export async function getLearningEffectiveness(): Promise<LearningEffectivenessMetrics> {
  const res = await fetch(`${API_BASE_URL}/impact/learning-effectiveness`, { headers: headers() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load learning effectiveness metrics");
  }
  return res.json();
}

export async function getImpactDashboard(): Promise<ImpactDashboard> {
  const res = await fetch(`${API_BASE_URL}/impact/dashboard`, { headers: headers() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load impact dashboard");
  }
  return res.json();
}

export async function listAdminRoleAssignments(): Promise<{ roles: AdminRoleAssignmentRecord[] }> {
  const res = await fetch(`${API_BASE_URL}/impact/rbac/roles`, { headers: headers() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load role assignments");
  }
  return res.json();
}

export async function upsertAdminRoleAssignment(data: {
  userId: string;
  role: string;
  scope: string;
}): Promise<{ message: string; userId: string; role: string; scope: string }> {
  const res = await fetch(`${API_BASE_URL}/impact/rbac/roles`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to assign role");
  }
  return res.json();
}

export async function listAbTests(): Promise<{ experiments: AbTestExperiment[] }> {
  const res = await fetch(`${API_BASE_URL}/impact/ab-tests`, { headers: headers() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load A/B tests");
  }
  return res.json();
}

export async function createAbTest(data: {
  name: string;
  channel: string;
  status?: "active" | "paused" | "completed";
  variants: AbVariant[];
}): Promise<AbTestExperiment> {
  const res = await fetch(`${API_BASE_URL}/impact/ab-tests`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create A/B test");
  }
  return res.json();
}

export async function assignAbVariant(
  experimentId: string,
  subjectKey: string
): Promise<{ experimentId: string; variant: string; assignmentId: string; isNew: boolean }> {
  const res = await fetch(`${API_BASE_URL}/impact/ab-tests/${encodeURIComponent(experimentId)}/assign`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ subjectKey }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to assign A/B variant");
  }
  return res.json();
}

export async function getAbTestSummary(experimentId: string): Promise<{
  experimentId: string;
  totals: { assignments: number; exposures: number };
  variants: Array<{ variantKey: string; assignmentCount: number; exposureCount: number }>;
}> {
  const res = await fetch(`${API_BASE_URL}/impact/ab-tests/${encodeURIComponent(experimentId)}/summary`, {
    headers: headers(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load A/B test summary");
  }
  return res.json();
}

export async function getAiAuditSummary(): Promise<AiAuditSummary> {
  const res = await fetch(`${API_BASE_URL}/impact/ai-audit-summary`, { headers: headers() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load AI audit summary");
  }
  return res.json();
}

export async function getCostMonitoring(): Promise<CostMonitoringSummary> {
  const res = await fetch(`${API_BASE_URL}/impact/cost-monitoring`, { headers: headers() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load cost monitoring");
  }
  return res.json();
}

export async function getEvidencePack(): Promise<EvidencePackResponse> {
  const res = await fetch(`${API_BASE_URL}/impact/evidence-pack`, { headers: headers() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to build evidence pack");
  }
  return res.json();
}

  // ── Survey Types ──

  export interface Survey {
    id: string;
    title: string;
    description: string;
    type: string;
    questions: Array<{
      id: string;
      text: string;
      type: string;
      scale?: { min: number; max: number; minLabel?: string; maxLabel?: string };
    }>;
    isActive: boolean;
  }

  export interface SurveyResponse {
    id: string;
    surveyId: string;
    userId: string;
    responses: Record<string, number | string>;
    submittedAt: string;
    updatedAt: string;
  }

  // ── Survey API Functions ──

  /** List all active surveys */
  export async function listSurveys(): Promise<Survey[]> {
    const res = await fetch(`${API_BASE_URL}/surveys`, { headers: headers() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to load surveys");
    }
    return res.json();
  }

  /** Get a specific survey by ID */
  export async function getSurvey(id: string): Promise<Survey> {
    const res = await fetch(`${API_BASE_URL}/surveys/${encodeURIComponent(id)}`, {
      headers: headers(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to load survey");
    }
    return res.json();
  }

  /** Submit a survey response */
  export async function submitSurveyResponse(
    surveyId: string,
    responses: Record<string, number | string>
  ): Promise<SurveyResponse> {
    const res = await fetch(`${API_BASE_URL}/surveys/${encodeURIComponent(surveyId)}/responses`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ responses }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to submit survey response");
    }
    return res.json();
  }

  /** Get user's response to a survey (if any) */
  export async function getUserSurveyResponse(surveyId: string): Promise<SurveyResponse | null> {
    const res = await fetch(`${API_BASE_URL}/surveys/${encodeURIComponent(surveyId)}/responses`, {
      headers: headers(),
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to load survey response");
    }
    return res.json();
  }
