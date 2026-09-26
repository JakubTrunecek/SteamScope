import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AchievementCollection } from '../src/AchievementCollection';
import { Library } from '../src/SteamScreens';
import { clearReviewMemory } from '../src/libraryReviews';
import { clearCollection } from '../src/collectionSession';
const id = '76561198004260198';
const games = Array.from({ length: 23 }, (_, index) => ({ appId: index + 1, name: `Game ${index + 1}`, playtimeMinutes: 0, recentMinutes: null }));
it.each(['achievements', 'reviews'])('loads twenty %s, stops and resumes all remaining without duplicates', async kind => {
  vi.useFakeTimers(); clearReviewMemory(); clearCollection(id);
  try {
    const fetcher = vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith('library') ? { status: 'available', total: games.length, games } : { status: 'unavailable', reason: 'not_exposed' })));
    vi.stubGlobal('fetch', fetcher);
    render(kind === 'achievements' ? <AchievementCollection id={id} games={games} /> : <Library id={id} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    const label = kind === 'achievements' ? 'Achievement scan size' : 'Review scan size';
    fireEvent.change(screen.getByLabelText(label), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: kind === 'achievements' ? 'Explore achievements' : 'Load reviews for next 20 games' }));
    expect(screen.getByLabelText(label)).toBeDisabled();
    await act(async () => { await vi.advanceTimersByTimeAsync(50001); });
    expect(screen.getByText('20 of 20 games completed in this run')).toBeVisible();
    fireEvent.change(screen.getByLabelText(label), { target: { value: 'all' } });
    const next = kind === 'achievements' ? 'Load all remaining games' : 'Load reviews for all remaining games';
    fireEvent.click(screen.getByRole('button', { name: next }));
    await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
    fireEvent.click(screen.getByRole('button', { name: kind === 'achievements' ? 'Stop loading' : 'Stop loading reviews' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(screen.getByText('1 of 3 games completed in this run')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: next }));
    await act(async () => { await vi.advanceTimersByTimeAsync(5001); });
    expect(screen.getByText('2 of 2 games completed in this run')).toBeVisible();
    expect(screen.getByRole('button', { name: next })).toBeDisabled();
    const urls = fetcher.mock.calls.map(([url]) => url).filter(url => !url.endsWith('library'));
    expect(urls).toHaveLength(23); expect(new Set(urls).size).toBe(23);
  } finally { vi.useRealTimers(); }
});

