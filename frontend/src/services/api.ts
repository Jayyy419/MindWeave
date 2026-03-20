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
  framework: string;
  preview: string;
  createdAt: string;
}

export interface EntryDetail {
  id: string;
  framework: string;
  originalText: string;
  reframedText: string;
  tags: string[];
  createdAt: string;
}

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

export interface CreateEntryRequest {
  text: string;
  framework: FrameworkId;
}

export interface ReframePreviewResponse {
  originalText: string;
  reframedText: string;
  framework: FrameworkId;
  source?: "ai";
}

// ── Profile Types ──

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  level: number;
  badges: string[];
  tags: string[];
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
export async function previewReframe(data: CreateEntryRequest): Promise<ReframePreviewResponse> {
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
): Promise<{ message: string; user: { id: string; email: string; username: string } }> {
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
}): Promise<{ message: string; user: { id: string; email: string; username: string } }> {
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
