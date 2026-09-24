import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Game, ReviewsResult } from '../../shared/api';
import { clearReviewMemory, compareReviews, matchesReviews } from '../src/libraryReviews';
import { Library } from '../src/SteamScreens';

const id = '76561198004260198';
const games: Game[] = Array.from({ length: 7 }, (_, index) => ({ appId: index + 1, name: `Game ${index + 1}`, playtimeMinutes: index === 6 ? 100 : 0, recentMinutes: null }));
const review = (positive: number, total: number): ReviewsResult => ({ status: 'available', data: { positive, negative: total - positive, total, fetchedAt: 1000 } });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
beforeEach(clearReviewMemory);
describe('Library review discovery', () => {
  it('sorts zero above unknown, breaks ties by sample size, and never treats empty reviews as a score', () => {
    const reviews = new Map<number, ReviewsResult>([[1, review(0, 10)], [2, review(9, 10)], [3, review(900, 1000)], [4, review(0, 0)]]);
    expect(games.slice(0, 4).sort((a, b) => compareReviews(a, b, reviews)).map(game => game.appId)).toEqual([3, 2, 1, 4]);
    expect(matchesReviews(review(9, 10), '90', 100)).toBe(false);
    expect(matchesReviews(review(900, 1000), '90', 1000)).toBe(true);
    expect(matchesReviews(review(0, 10), '0', 0)).toBe(true);
    expect(matchesReviews(review(0, 0), '0', 0)).toBe(false);
    expect(matchesReviews(undefined, 'all', 0)).toBe(true);
    expect(matchesReviews(undefined, '80', 0)).toBe(false);
  });
  it('loads only five games matching playtime/name filters, supports score filters and keeps snapshots across remounts', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn(async (url: string) => json(url.endsWith('library') ? { status: 'available', total: games.length, games } : review(900, 1000)));
      vi.stubGlobal('fetch', fetcher);
      let view = render(<Library id={id} />);
      await act(async () => { await vi.advanceTimersByTimeAsync(1); });
      expect(fetcher).toHaveBeenCalledTimes(1);
      fireEvent.change(screen.getByLabelText('Playtime group'), { target: { value: 'zero' } });
      fireEvent.change(screen.getByLabelText('Positive reviews'), { target: { value: '90' } });
      expect(screen.getByText('No games match your search.')).toBeVisible();
      fireEvent.click(screen.getByText('Load reviews for next 5 games'));
      await act(async () => { await vi.advanceTimersByTimeAsync(13000); });
      expect(screen.getByText('5 of 6 matching games checked for reviews')).toBeVisible();
      expect(fetcher.mock.calls.filter(([url]) => url.endsWith('reviews'))).toHaveLength(5);
      expect(fetcher.mock.calls.some(([url]) => url.includes('/games/7/'))).toBe(false);
      expect(screen.getAllByRole('link')).toHaveLength(5);
      view.unmount(); view = render(<Library id={id} />);
      await act(async () => { await vi.advanceTimersByTimeAsync(1); });
      expect(screen.getByText('5 of 7 matching games checked for reviews')).toBeVisible();
      expect(fetcher.mock.calls.filter(([url]) => url.endsWith('reviews'))).toHaveLength(5);
      view.unmount();
    } finally { vi.useRealTimers(); }
  });
  it('stops on rate limits, retries unfinished games and cancels queued work when leaving', async () => {
    vi.useFakeTimers();
    try {
      let failed = false;
      const fetcher = vi.fn(async (url: string) => {
        if (url.endsWith('library')) return json({ status: 'available', total: 2, games: games.slice(0, 2) });
        if (!failed) { failed = true; return json({ error: 'rate_limited' }, 429); }
        return json({ status: 'unavailable', reason: 'not_exposed' });
      });
      vi.stubGlobal('fetch', fetcher); const view = render(<Library id={id} />);
      await act(async () => { await vi.advanceTimersByTimeAsync(1); });
      fireEvent.click(screen.getByText('Load reviews for next 5 games'));
      await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
      expect(screen.getByText('Too many requests. Wait a minute, then continue.')).toBeVisible();
      expect(screen.getByText('0 of 2 matching games checked for reviews')).toBeVisible();
      fireEvent.click(screen.getByText('Load reviews for next 5 games'));
      await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
      expect(screen.getByText('1 of 2 matching games checked for reviews')).toBeVisible();
      expect(screen.getByText('Reviews unavailable')).toBeVisible();
      view.unmount();
      await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
      expect(fetcher.mock.calls.filter(([url]) => url.endsWith('reviews'))).toHaveLength(2);
    } finally { vi.useRealTimers(); }
  });
});
