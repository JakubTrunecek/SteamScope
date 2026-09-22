import type { Achievement, Game, SchemaAchievement } from '../../shared/api';

export function gamePosition(games: Game[], appId: number) {
  const minutes = games.find(game => game.appId === appId)?.playtimeMinutes;
  const total = games.reduce((sum, game) => sum + (game.playtimeMinutes ?? 0), 0);
  return {
    rank: minutes != null && minutes > 0 ? 1 + games.filter(game => game.playtimeMinutes !== null && game.playtimeMinutes > minutes).length : null,
    share: minutes != null && total > 0 ? minutes / total * 100 : null,
    unknown: games.filter(game => game.playtimeMinutes === null).length,
  };
}

export function sortAchievements(items: Achievement[], order: string, rates: Map<string, number>, metadata: Map<string, SchemaAchievement>) {
  if (order === 'steam') return items;
  return [...items].sort((a, b) => {
    if (order === 'name') return (metadata.get(a.name)?.displayName ?? a.name).localeCompare(metadata.get(b.name)?.displayName ?? b.name) || a.name.localeCompare(b.name);
    if (order === 'rare') {
      const left = rates.get(a.name), right = rates.get(b.name);
      if (left === undefined || right === undefined) return left === right ? a.name.localeCompare(b.name) : left === undefined ? 1 : -1;
      return left - right || a.name.localeCompare(b.name);
    }
    const date = (item: Achievement) => item.achieved && item.unlockTime !== null && item.unlockTime > 0 ? item.unlockTime : 0;
    return date(b) - date(a) || a.name.localeCompare(b.name);
  });
}
