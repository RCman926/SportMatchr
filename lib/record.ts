/** Optional self-reported results — not a ranked ladder. */

export type GameResult = 'win' | 'loss' | 'draw' | 'fun';

export type ResultLogEntry = {
  result: GameResult;
  sport?: string;
  at: string;
  sessionId?: string;
};

export function winPercent(wins: number, losses: number, draws: number): number | null {
  const n = wins + losses + draws;
  if (n <= 0) return null;
  return Math.round((wins / n) * 100);
}

export function recordLabel(wins: number, losses: number, draws: number): string {
  if (wins + losses + draws <= 0) return 'No record yet';
  if (draws > 0) return `${wins}–${losses}–${draws}`;
  return `${wins}–${losses}`;
}

/** Compare last few decisive games to earlier ones — soft improvement signal. */
export function resultTrend(log: ResultLogEntry[]): string {
  const decisive = log.filter((e) => e.result === 'win' || e.result === 'loss');
  if (decisive.length < 3) return 'Building a record';

  const recent = decisive.slice(0, 5);
  const recentPct = recent.filter((e) => e.result === 'win').length / recent.length;

  if (decisive.length >= 6) {
    const earlier = decisive.slice(5, 10);
    if (earlier.length >= 3) {
      const earlierPct = earlier.filter((e) => e.result === 'win').length / earlier.length;
      if (recentPct - earlierPct >= 0.15) return 'Improving lately';
      if (earlierPct - recentPct >= 0.15) return 'Rough patch — keep playing';
    }
  }

  if (recentPct >= 0.7) return 'On a good run';
  if (recentPct <= 0.3) return 'Working on it';
  return 'Holding steady';
}

export function sportBreakdown(log: ResultLogEntry[]): {
  sport: string;
  wins: number;
  losses: number;
  draws: number;
  pct: number | null;
}[] {
  const map = new Map<string, { wins: number; losses: number; draws: number }>();
  for (const e of log) {
    if (e.result === 'fun' || !e.sport) continue;
    const cur = map.get(e.sport) ?? { wins: 0, losses: 0, draws: 0 };
    if (e.result === 'win') cur.wins += 1;
    else if (e.result === 'loss') cur.losses += 1;
    else if (e.result === 'draw') cur.draws += 1;
    map.set(e.sport, cur);
  }
  return [...map.entries()]
    .map(([sport, c]) => ({
      sport,
      ...c,
      pct: winPercent(c.wins, c.losses, c.draws),
    }))
    .sort((a, b) => b.wins + b.losses + b.draws - (a.wins + a.losses + a.draws))
    .slice(0, 4);
}

export function bumpCounters(
  wins: number,
  losses: number,
  draws: number,
  result: GameResult,
  delta: 1 | -1
): { wins: number; losses: number; draws: number } {
  const next = { wins, losses, draws };
  if (result === 'win') next.wins = Math.max(0, next.wins + delta);
  if (result === 'loss') next.losses = Math.max(0, next.losses + delta);
  if (result === 'draw') next.draws = Math.max(0, next.draws + delta);
  return next;
}
