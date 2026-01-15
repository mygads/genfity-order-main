import { afterEach, vi } from 'vitest';

// Ensure RTL tests don't leak DOM between cases.
// This file is used for both node and jsdom tests, so guard on document.
afterEach(async () => {
	if (typeof document === 'undefined') return;
	const mod = await import('@testing-library/react');
	mod.cleanup();
});

// Stabilize snapshots that include the current year.
vi.useFakeTimers();
vi.setSystemTime(new Date('2026-01-11T00:00:00.000Z'));
