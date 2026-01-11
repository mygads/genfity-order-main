import { vi } from 'vitest';

// Stabilize snapshots that include the current year.
vi.useFakeTimers();
vi.setSystemTime(new Date('2026-01-11T00:00:00.000Z'));
