import { act, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { collectionInsights } from '../src/collectionInsights';
import { AchievementCollection } from '../src/AchievementCollection';
import { achievementMatches, numberRange, unlockRange } from '../src/searchFilters';
import { clearCollection, readCollection, saveCollection } from '../src/collectionSession';

const game = { appId: 550, name: 'Game', playtimeMinutes: 20, recentMinutes: null };
const id = '76561198004260198';
beforeEach(() => { clearCollection(id); clearCollection('other'); });
describe('Collection coverage and dates', () => {
  it('keeps the selected day and results across navigation without fetching, isolates profiles and clears on request', () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    saveCollection(id, { rows: [{ game, labels: { B: 'Leap day unlock' }, percentages: {}, achievements: [
      { name: 'B', achieved: true, unlockTime: 1709251199 },
      { name: 'UNDATED', achieved: true, unlockTime: null },
      { name: 'LOCKED', achieved: false, unlockTime: 1709251199 },
    ] }], month: '', day: '' });
    let view = render(<AchievementCollection id={id} games={[game]} />);
    act(() => screen.getByRole('button', { name: '2024-02-29: 1 unlocks' }).click());
    expect(screen.getByRole('button', { name: '2024-02-29: 1 unlocks' })).toHaveAttribute('aria-pressed', 'true');
    const daily = () => within(screen.getByRole('region', { name: 'Selected day achievements' }));
    expect(daily().getByRole('link', { name: 'Leap day unlock' })).toHaveAttribute('href', `#/profile/${id}/game/550`);
    expect(daily().getByText('Game · 23:59:59 UTC')).toBeVisible();
    expect(daily().queryByText('UNDATED')).not.toBeInTheDocument();
    view.unmount();
    view = render(<AchievementCollection id="other" games={[game]} />);
    expect(screen.getByText(/0 of 1 games checked/)).toBeVisible(); view.unmount();
    view = render(<AchievementCollection id={id} games={[game]} />);
    expect(daily().getByRole('link', { name: 'Leap day unlock' })).toBeVisible();
    expect(fetcher).not.toHaveBeenCalled();
    act(() => screen.getByRole('button', { name: '2024-02-28: 0 unlocks' }).click());
    expect(daily().getByText('No dated unlocks on this day in the loaded results.')).toBeVisible();
    act(() => screen.getByRole('button', { name: 'Clear loaded results' }).click());
    expect(screen.getByText(/0 of 1 games checked/)).toBeVisible();
    expect(readCollection(id).rows).toEqual([]); view.unmount();
  });
  it('bounds tab memory to three profiles and drops games no longer in the returned library', () => {
    const snapshot = { rows: [{ game, achievements: [], labels: {}, percentages: {} }], month: '', day: '' };
    for (const profile of ['one', 'two', 'three', 'four']) saveCollection(profile, snapshot);
    expect(readCollection('one').rows).toEqual([]);
    expect(readCollection('four').rows).toHaveLength(1);
    saveCollection(id, snapshot);
    render(<AchievementCollection id={id} games={[{ ...game, appId: 999 }]} />);
    expect(screen.getByText(/0 of 1 games checked/)).toBeVisible();
    for (const profile of ['one', 'two', 'three', 'four']) clearCollection(profile);
  });
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
      expect(screen.getByText(/^1 of 2 games checked/)).toHaveTextContent('1 unavailable');
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
