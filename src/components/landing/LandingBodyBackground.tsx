'use client';

import { Meteors } from '@/components/magicui/meteors';
import { cn } from '@/lib/utils';

export default function LandingBodyBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden bg-white', className)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_30%_10%,rgba(23,60,130,0.18),transparent_58%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_70%_70%,rgba(16,185,129,0.16),transparent_58%)]" />
      <div className="absolute inset-0 opacity-[0.22] bg-[linear-gradient(to_right,rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute inset-0 opacity-[0.26]">
        <Meteors number={90} />
      </div>
    </div>
  );
}
