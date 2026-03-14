/**
 * API service layer for MindWeave frontend.
 * All requests include the x-anonymous-id header for user identification.
 * The Vite dev server proxies /api requests to the backend at localhost:3001.
 */

const API_BASE = "/api";

function getAnonymousId(): string {
  return localStorage.getItem("mindweave-anonymous-id") || "";
}

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-anonymous-id": getAnonymousId(),
  };
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

export interface CreateEntryRequest {
  text: string;
  framework: "cbt" | "iceberg" | "growth";
}

// ── Profile Types ──

export interface UserProfile {
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
    anonymousId: string;
    level: number;
    joinedAt: string;
  }[];
  isJoined: boolean;
}

// ── API Functions ──

/** Create a new journal entry with AI reframing */
export async function createEntry(data: CreateEntryRequest): Promise<EntryDetail> {
  const res = await fetch(`${API_BASE}/entries`, {
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

/** List all journal entries for the current user */
export async function listEntries(): Promise<EntryPreview[]> {
  const res = await fetch(`${API_BASE}/entries`, { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch entries");
  return res.json();
}

/** Get a single journal entry by ID */
export async function getEntry(id: string): Promise<EntryDetail> {
  const res = await fetch(`${API_BASE}/entries/${encodeURIComponent(id)}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error("Failed to fetch entry");
  return res.json();
}

/** Get the current user's profile */
export async function getProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/user/profile`, { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

/** List all think tanks */
export async function listThinkTanks(): Promise<ThinkTankPreview[]> {
  const res = await fetch(`${API_BASE}/thinktanks`, { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch think tanks");
  return res.json();
}

/** List think tanks available to the current user based on tags */
export async function listAvailableThinkTanks(): Promise<{
  message?: string;
  available: ThinkTankPreview[];
}> {
  const res = await fetch(`${API_BASE}/thinktanks/available`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error("Failed to fetch available think tanks");
  return res.json();
}

/** Get details of a single think tank */
export async function getThinkTank(id: string): Promise<ThinkTankDetail> {
  const res = await fetch(`${API_BASE}/thinktanks/${encodeURIComponent(id)}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error("Failed to fetch think tank");
  return res.json();
}

/** Join a think tank */
export async function joinThinkTank(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/thinktanks/${encodeURIComponent(id)}/join`, {
    method: "POST",
    headers: headers(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to join think tank");
  }
}
