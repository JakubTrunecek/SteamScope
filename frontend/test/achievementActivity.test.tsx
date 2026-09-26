import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { summarizeYear } from '../src/achievementActivity';
import { AchievementCollection } from '../src/AchievementCollection';
import { clearCollection, saveCollection } from '../src/collectionSession';

describe('Achievement year', () => {
  it('counts unique UTC dates, crosses leap day, breaks gaps and clips streaks at the year boundary', () => {
    const days: [string, number][] = [['2023-12-31', 10], ['2024-01-01', 2], ['2024-03-02', 5], ['2024-02-28', 5], ['2024-02-29', 3], ['2024-03-01', 1], ['2024-03-04', 4]];
    const result = summarizeYear(days, '2024');
    expect(result.total).toBe(20); expect(result.activeDays).toBe(6); expect(result.streak).toBe(4);
    expect(result.best).toEqual({ date: '2024-02-28', count: 5 });
    expect(result.months[1].count).toBe(8); expect(result.months[2].count).toBe(10);
    expect(result.months).toHaveLength(12); expect(result.months[3].count).toBe(0);
    expect(summarizeYear(days, '2023').streak).toBe(1);
    expect(days[0][0]).toBe('2023-12-31');
  });
  it('handles empty years without fabricating a best date or streak', () => {
    expect(summarizeYear([], '2026')).toMatchObject({ total: 0, activeDays: 0, streak: 0, best: null });
  });
  it('opens the chosen calendar month, moves focus and switches years without fetching', () => {
    const id = '76561198004260999';
    const game = { appId: 550, name: 'Fixture game', playtimeMinutes: 1, recentMinutes: null };
    const date = (value: string) => Date.parse(value) / 1000;
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    saveCollection(id, { month: '', day: '', rows: [{ game, labels: {}, percentages: {}, achievements: [
      { name: 'FEB', achieved: true, unlockTime: date('2024-02-29T23:59:59Z') },
      { name: 'MARCH', achieved: true, unlockTime: date('2024-03-01T00:00:00Z') },
      { name: 'OLDER', achieved: true, unlockTime: date('2023-12-31T12:00:00Z') },
      { name: 'MISSING', achieved: true, unlockTime: null },
      { name: 'LOCKED', achieved: false, unlockTime: date('2024-02-29T12:00:00Z') },
    ] }] });
    const view = render(<AchievementCollection id={id} games={[game]} />);
    try {
      expect(screen.getByRole('button', { name: '2024-01: 0 unlocks, open calendar' })).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: '2024-02: 1 unlocks, open calendar' }));
      expect(screen.getByLabelText('Month (UTC)')).toHaveValue('2024-02');
      expect(screen.getByLabelText('Month (UTC)')).toHaveFocus();
      fireEvent.click(screen.getByRole('button', { name: '2024-02-29: 1 unlocks' }));
      expect(within(screen.getByRole('region', { name: 'Selected day achievements' })).getByRole('link', { name: 'FEB' })).toBeVisible();
      fireEvent.change(screen.getByLabelText('Year (UTC)'), { target: { value: '2023' } });
      expect(screen.getByLabelText('Month (UTC)')).toHaveValue('2023-12');
      expect(screen.getByText('Select a day above.')).toBeVisible();
      expect(fetcher).not.toHaveBeenCalled();
    } finally { view.unmount(); clearCollection(id); }
  });
});
