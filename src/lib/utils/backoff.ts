/**
 * Shared backoff utility with optional localStorage persistence.
 */

type BackoffOptions = {
  key: string;
  baseMs?: number;
  maxMs?: number;
  jitter?: number;
  persist?: boolean;
};

type BackoffState = {
  failureCount: number;
  nextAllowedAt: number;
};

const DEFAULT_BASE_MS = 2000;
const DEFAULT_MAX_MS = 60000;
const DEFAULT_JITTER = 0.2;
const BACKOFF_STORAGE_PREFIX = 'genfity_backoff_';

type BackoffEvent = {
  key: string;
  type: 'scheduled' | 'reset' | 'blocked';
  failureCount: number;
  nextAllowedAt: number;
  delayMs?: number;
};

type BackoffMetricsHook = (event: BackoffEvent) => void;

let metricsHook: BackoffMetricsHook | null = null;

export function setBackoffMetricsHook(hook: BackoffMetricsHook | null) {
  metricsHook = hook;
}

export function getBackoffState(key: string): BackoffState {
  return getState({ key, persist: true });
}

export function getAllBackoffStates(): Array<BackoffState & { key: string }> {
  const collected = new Map<string, BackoffState>();

  for (const [key, state] of memoryState.entries()) {
    collected.set(key, state);
  }

  if (typeof window !== 'undefined') {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(BACKOFF_STORAGE_PREFIX)) continue;
      const persisted = readPersisted(key);
      if (persisted) {
        collected.set(key, persisted);
      }
    }
  }

  return Array.from(collected.entries())
    .map(([key, state]) => ({ key, ...state }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

const memoryState = new Map<string, BackoffState>();

function readPersisted(key: string): BackoffState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BackoffState;
    if (typeof parsed.nextAllowedAt !== 'number' || typeof parsed.failureCount !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersisted(key: string, state: BackoffState) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function getState(options: BackoffOptions): BackoffState {
  if (options.persist) {
    const persisted = readPersisted(options.key);
    if (persisted) {
      memoryState.set(options.key, persisted);
      return persisted;
    }
  }

  const existing = memoryState.get(options.key);
  if (existing) return existing;

  const initial: BackoffState = { failureCount: 0, nextAllowedAt: 0 };
  memoryState.set(options.key, initial);
  return initial;
}

function setState(options: BackoffOptions, state: BackoffState) {
  memoryState.set(options.key, state);
  if (options.persist) {
    writePersisted(options.key, state);
  }
}

export function canAttemptBackoff(options: BackoffOptions): boolean {
  const state = getState(options);
  const allowed = Date.now() >= state.nextAllowedAt;
  if (!allowed && metricsHook) {
    metricsHook({
      key: options.key,
      type: 'blocked',
      failureCount: state.failureCount,
      nextAllowedAt: state.nextAllowedAt,
    });
  }
  return allowed;
}

export function scheduleBackoff(options: BackoffOptions): BackoffState {
  const state = getState(options);
  const baseMs = options.baseMs ?? DEFAULT_BASE_MS;
  const maxMs = options.maxMs ?? DEFAULT_MAX_MS;
  const jitter = options.jitter ?? DEFAULT_JITTER;
  const rawDelay = Math.min(maxMs, baseMs * Math.pow(2, state.failureCount));
  const jitterFactor = Math.max(0, 1 + (Math.random() * 2 - 1) * jitter);
  const delay = Math.min(maxMs, Math.floor(rawDelay * jitterFactor));

  const updated: BackoffState = {
    failureCount: state.failureCount + 1,
    nextAllowedAt: Date.now() + delay,
  };

  setState(options, updated);
  if (metricsHook) {
    metricsHook({
      key: options.key,
      type: 'scheduled',
      failureCount: updated.failureCount,
      nextAllowedAt: updated.nextAllowedAt,
      delayMs: delay,
    });
  }
  return updated;
}

export function resetBackoff(options: BackoffOptions): BackoffState {
  const updated: BackoffState = { failureCount: 0, nextAllowedAt: 0 };
  setState(options, updated);
  if (metricsHook) {
    metricsHook({
      key: options.key,
      type: 'reset',
      failureCount: updated.failureCount,
      nextAllowedAt: updated.nextAllowedAt,
    });
  }
  return updated;
}
