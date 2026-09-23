import type { Achievement, Game } from '../../shared/api';

export interface ScannedGame { game: Game; achievements: Achievement[] | null; labels: Record<string, string>; percentages: Record<string, number> }
export function collectionInsights(rows: ScannedGame[]) {
  const supported = rows.filter(row => row.achievements !== null && row.achievements.length > 0);
  const unlocked = supported.flatMap(row => row.achievements!.filter(item => item.achieved).map(item => ({ ...item, game: row.game, label: row.labels[item.name] ?? item.name, percent: row.percentages[item.name] })));
  const dated = unlocked.filter(item => item.unlockTime !== null && item.unlockTime > 0 && Number.isFinite(new Date(item.unlockTime * 1000).getTime()));
  const days = new Map<string, number>();
  for (const item of dated) { const day = new Date(item.unlockTime! * 1000).toISOString().slice(0, 10); days.set(day, (days.get(day) ?? 0) + 1); }
  return {
    dated,
    supported: supported.length, unlocked: unlocked.length, undated: unlocked.length - dated.length,
    rarest: unlocked.filter(item => item.percent !== undefined).sort((a, b) => a.percent - b.percent).slice(0, 5),
    latest: dated.sort((a, b) => b.unlockTime! - a.unlockTime!).slice(0, 5),
    completion: supported.map(row => ({ game: row.game, total: row.achievements!.length, remaining: row.achievements!.filter(item => !item.achieved).length })).sort((a, b) => a.remaining - b.remaining),
    days: [...days].sort(([a], [b]) => b.localeCompare(a)),
  };
}
