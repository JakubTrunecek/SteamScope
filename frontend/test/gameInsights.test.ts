import { expect, it } from 'vitest';
import { gamePosition, sortAchievements } from '../src/gameInsights';
import type { Achievement, Game } from '../../shared/api';

it('shares ranks for equal playtime and distinguishes missing, zero and absent games', () => {
  const games: Game[] = [120, 120, 60, 0, null].map((playtimeMinutes, appId) => ({ appId, playtimeMinutes, recentMinutes: null, name: String(appId) }));
  expect(gamePosition(games, 0)).toEqual({ rank: 1, share: 40, unknown: 1 });
  expect(gamePosition(games, 1).rank).toBe(1);
  expect(gamePosition(games, 2).rank).toBe(3);
  expect(gamePosition(games, 3)).toMatchObject({ rank: null, share: 0 });
  expect(gamePosition(games, 4)).toMatchObject({ rank: null, share: null });
  expect(gamePosition(games, 999).share).toBeNull();
  expect(gamePosition([games[3]], 3).share).toBeNull();
});

const items: Achievement[] = [
  { name: 'UNKNOWN', achieved: true, unlockTime: null },
  { name: 'ZERO', achieved: true, unlockTime: 10 },
  { name: 'RARE', achieved: true, unlockTime: 20 },
  { name: 'LOCKED', achieved: false, unlockTime: 30 },
];
it('sorts global zero correctly and puts missing rates last without mutating Steam order', () => {
  expect(sortAchievements(items, 'rare', new Map([['ZERO', 0], ['RARE', 1]]), new Map()).map(item => item.name)).toEqual(['ZERO', 'RARE', 'LOCKED', 'UNKNOWN']);
  expect(sortAchievements(items, 'steam', new Map(), new Map()).map(item => item.name)).toEqual(['UNKNOWN', 'ZERO', 'RARE', 'LOCKED']);
});
it('sorts actual dated unlocks ahead of locked and undated entries', () => {
  expect(sortAchievements(items, 'recent', new Map(), new Map()).map(item => item.name)).toEqual(['RARE', 'ZERO', 'LOCKED', 'UNKNOWN']);
});
