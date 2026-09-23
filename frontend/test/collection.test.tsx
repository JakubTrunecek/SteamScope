import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { collectionInsights } from '../src/collectionInsights';
import { AchievementCollection } from '../src/AchievementCollection';
import { achievementMatches, numberRange, unlockRange } from '../src/searchFilters';

const game = { appId: 550, name: 'Game', playtimeMinutes: 20, recentMinutes: null };
describe('Collection coverage and dates', () => {
  it('excludes unavailable and empty games from completion and keeps zero rarity', () => {
    const result = collectionInsights([
      { game, achievements: null, labels: {}, percentages: {} },
      { game, achievements: [], labels: {}, percentages: {} },
      { game, achievements: [{ name: 'A', achieved: true, unlockTime: 0 }, { name: 'B', achieved: true, unlockTime: 1709251199 }], labels: {}, percentages: { A: 0 } },
    ]);
    expect(result.supported).toBe(1); expect(result.completion[0].remaining).toBe(0);
    expect(result.rarest[0].percent).toBe(0); expect(result.undated).toBe(1);
    expect(result.days).toEqual([['2024-02-29', 1]]);
  });
  it('only starts on demand, preserves unavailable coverage, and cancels pending work', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'unavailable', reason: 'not_exposed' })));
      vi.stubGlobal('fetch', fetcher);
      const view = render(<AchievementCollection id="76561198004260198" games={[game, { ...game, appId: 2 }]} />);
      expect(fetcher).not.toHaveBeenCalled();
      act(() => screen.getByText('Explore achievements').click());
      await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
      expect(screen.getByText(/1 of 2 games checked/)).toHaveTextContent('1 unavailable');
      act(() => screen.getByText('Stop loading').click());
      await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
      expect(fetcher).toHaveBeenCalledTimes(1);
      view.unmount();
    } finally { vi.useRealTimers(); }
  });
});
describe('Search range boundaries', () => {
  it('handles exact negative and scientific values and invalid ranges', () => {
    expect(numberRange('-1.25', '1e2').matches(-1.25)).toBe(true);
    expect(numberRange('2', '1').valid).toBe(false);
    expect(numberRange('Infinity', '').valid).toBe(false);
    expect(numberRange('', '').matches(0)).toBe(true);
  });
  it('includes the full final UTC day and excludes absent dates and hidden descriptions', () => {
    const item = { name: 'A', achieved: true, unlockTime: 1709251199 };
    expect(unlockRange('2024-02-29', '2024-02-29').matches(item)).toBe(true);
    expect(unlockRange('2024-02-29', '2024-02-29').matches({ ...item, unlockTime: 1709251200 })).toBe(false);
    expect(unlockRange('2023-02-29', '').valid).toBe(false);
    expect(unlockRange('2024-02-29', '').matches({ ...item, unlockTime: null })).toBe(false);
    expect(achievementMatches({ ...item, achieved: false }, { name: 'A', displayName: null, description: 'spoiler', hidden: true }, 'spoiler')).toBe(false);
  });
});
