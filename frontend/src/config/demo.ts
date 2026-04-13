/**
 * Demo Mode Configuration
 * ========================
 * Set DEMO_MODE to `true` to enable public demo access without requiring accounts.
 * Set it back to `false` to restore normal production auth flow.
 *
 * When demo mode is active:
 *  - Users see a landing page and can enter MindWeave with one click (no signup)
 *  - Live reframing is capped at MAX_DEMO_REFRAMES per browser session
 *  - A persistent banner reminds users they are in demo mode
 *  - Saving entries is disabled (demo users cannot persist journal entries)
 */

export const DEMO_MODE = true;

/** Maximum number of live reframes a demo user can trigger before being asked to sign up. */
export const MAX_DEMO_REFRAMES = 5;

/** localStorage key used to track how many demo reframes have been used. */
export const DEMO_REFRAME_COUNT_KEY = "mindweave-demo-reframe-count";

/** localStorage key for the demo anonymous session ID. */
export const DEMO_SESSION_KEY = "mindweave-demo-session";

export function getDemoReframeCount(): number {
  const raw = localStorage.getItem(DEMO_REFRAME_COUNT_KEY);
  return raw ? parseInt(raw, 10) || 0 : 0;
}

export function incrementDemoReframeCount(): number {
  const next = getDemoReframeCount() + 1;
  localStorage.setItem(DEMO_REFRAME_COUNT_KEY, String(next));
  return next;
}

export function getDemoRemaining(): number {
  return Math.max(0, MAX_DEMO_REFRAMES - getDemoReframeCount());
}

export function isDemoLimitReached(): boolean {
  return getDemoReframeCount() >= MAX_DEMO_REFRAMES;
}

export function getDemoSessionId(): string {
  let id = localStorage.getItem(DEMO_SESSION_KEY);
  if (!id) {
    id = `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEMO_SESSION_KEY, id);
  }
  return id;
}

export function clearDemoSession(): void {
  localStorage.removeItem(DEMO_REFRAME_COUNT_KEY);
  localStorage.removeItem(DEMO_SESSION_KEY);
}
