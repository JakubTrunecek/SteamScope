import type { ScannedGame } from './collectionInsights';
import { csv } from './export';
import { unlockRange } from './searchFilters';

export const explorerDefaults = { query: '', game: 'all', state: 'all', rarity: 'all', order: 'name', from: '', to: '', dated: false };
export type ExplorerFilters = typeof explorerDefaults;
export function collectionAchievements(rows: ScannedGame[]) {
  return rows.flatMap(row => (row.achievements ?? []).map(item => ({ ...item, game: row.game, steamLabel: row.labels[item.name], label: row.labels[item.name] ?? item.name, percent: row.percentages[item.name], date: item.achieved && item.unlockTime !== null && item.unlockTime > 0 && Number.isFinite(new Date(item.unlockTime * 1000).getTime()) ? new Date(item.unlockTime * 1000).toISOString() : null })));
}
export type CollectionAchievement = ReturnType<typeof collectionAchievements>[number];
export function filterCollection(items: CollectionAchievement[], filters: ExplorerFilters) {
  const dates = unlockRange(filters.from, filters.to);
  return items.filter(item => (filters.game === 'all' || String(item.game.appId) === filters.game)
    && (filters.state === 'all' || item.achieved === (filters.state === 'unlocked'))
    && `${item.label} ${item.name} ${item.game.name}`.toLocaleLowerCase().includes(filters.query.trim().toLocaleLowerCase())
    && (filters.rarity === 'all' || (filters.rarity === 'unknown' ? item.percent === undefined : item.percent !== undefined && item.percent <= Number(filters.rarity)))
    && (!filters.dated || item.date !== null) && (!(filters.from || filters.to) || item.date !== null) && dates.matches(item))
    .sort((a, b) => {
      const tie = a.label.localeCompare(b.label) || a.game.name.localeCompare(b.game.name) || a.game.appId - b.game.appId || a.name.localeCompare(b.name);
      if (filters.order === 'rare') return (a.percent ?? Infinity) - (b.percent ?? Infinity) || tie;
      if (filters.order === 'recent') return (b.date ? b.unlockTime! : 0) - (a.date ? a.unlockTime! : 0) || tie;
      if (filters.order === 'game') return a.game.name.localeCompare(b.game.name) || tie;
      return tie;
    });
}
export function collectionCsv(items: CollectionAchievement[]) {
  return csv([['app_id', 'game', 'internal_name', 'steam_label', 'unlocked', 'unlock_time_utc', 'global_percent'], ...items.map(item => [item.game.appId, item.game.name, item.name, item.steamLabel, item.achieved, item.date, item.percent])]);
}
