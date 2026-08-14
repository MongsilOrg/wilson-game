'use client';

import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AudioControl } from '@/components/game/AudioControl';

export function SiteHeader() {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Wilson Game</p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">윌슨게임</h1>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <AudioControl />
      </div>
    </header>
  );
}
