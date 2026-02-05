'use client';

import { Meteors } from '@/components/magicui/meteors';
import { cn } from '@/lib/utils';

export default function LandingBodyBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden bg-slate-50', className)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_0%,rgba(56,189,248,0.18),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_80%_70%,rgba(99,102,241,0.16),transparent_55%)]" />
      <div className="absolute inset-0 opacity-[0.18] bg-[linear-gradient(to_right,rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-size-[64px_64px]" />
      <div className="absolute inset-0 opacity-[0.22]">
        <Meteors number={90} />
      </div>
    </div>
  );
}
