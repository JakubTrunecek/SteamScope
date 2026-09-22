import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LibraryInsights, summarize, TimeChart } from '../src/Insights';
import { achievementHighlights } from '../src/AchievementHighlights';
import type { Game } from '../../shared/api';

const game = (appId: number, minutes: number | null): Game => ({ appId, name: `Game ${appId}`, playtimeMinutes: minutes, recentMinutes: null });
describe('Playtime insight calculations', () => {
  it('keeps unknown times separate and applies exact category boundaries', () => {
    const input = [game(1, null), game(2, 0), game(3, 1), game(4, 119), game(5, 120)];
    const result = summarize(input);
    expect(result).toMatchObject({ unknown: 1, zero: 1, sampled: 2, invested: 1, total: 240, share: 100 });
    expect(result.ranked.map(item => item.appId)).toEqual([5, 4, 3]);
    expect(input[0].appId).toBe(1);
  });
  it('calculates top-five share against all known time, not only the chart', () => {
    const result = summarize(Array.from({ length: 6 }, (_, index) => game(index, 60)));
    expect(result.share).toBeCloseTo(100 * 5 / 6);
    expect(summarize([game(1, 0), game(2, null)]).share).toBeNull();
    expect(summarize([]).share).toBeNull();
  });
  it('shows unknown coverage and avoids charts with zero denominators', () => {
    render(<LibraryInsights games={[game(1, null)]} id="test" />);
    expect(screen.getByText('Time unavailable')).toBeVisible();
    expect(screen.getByText('No positive playtime was returned.')).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it('uses recent minutes for the recent chart and ranks independently of lifetime', () => {
    render(<TimeChart id="test" recent games={[{ ...game(1, 1000), recentMinutes: 10 }, { ...game(2, 100), recentMinutes: 30 }, game(3, 2000)]} />);
    expect(screen.getAllByRole('link').map(item => item.textContent)).toEqual(['Game 2', 'Game 1']);
    expect(screen.getByText('75% of returned recent playtime')).toBeVisible();
  });
});
describe('Achievement highlight calculations', () => {
  it('retains zero global rates, skips unknown rates and excludes undated or locked unlocks', () => {
    const items = [
      { name: 'ZERO', achieved: true, unlockTime: null },
      { name: 'OLD', achieved: true, unlockTime: 10 },
      { name: 'NEW', achieved: true, unlockTime: 20 },
      { name: 'UNKNOWN', achieved: true, unlockTime: 0 },
      { name: 'LOCKED', achieved: false, unlockTime: 30 },
    ];
    const result = achievementHighlights(items, new Map([['ZERO', 0], ['OLD', 2], ['NEW', 1], ['LOCKED', 0.5]]));
    expect(result.rare.map(item => item.name)).toEqual(['ZERO', 'NEW', 'OLD']);
    expect(result.recent.map(item => item.name)).toEqual(['NEW', 'OLD']);
    expect(result.locked.map(item => item.name)).toEqual(['LOCKED']);
    expect(achievementHighlights(items, new Map()).rare).toEqual([]);
  });
});
