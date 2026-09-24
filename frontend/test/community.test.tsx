import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GameCommunity } from '../src/GameCommunity';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
describe('Community panels', () => {
  it('renders explicit zero players and no reviews without an invented percentage', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => json({ status: 'available', data: url.endsWith('players') ? { count: 0, fetchedAt: 1000 } : { total: 0, positive: 0, negative: 0, fetchedAt: 1000 } })));
    render(<GameCommunity appId="550" />);
    expect(await screen.findByText('No reviews in this selection yet.')).toBeVisible();
    expect(within(screen.getByRole('region', { name: 'Playing now' })).getByText('0')).toBeVisible();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });
  it('keeps review data visible when players fail and retries just that request', async () => {
    let attempts = 0;
    const fetcher = vi.fn(async (url: string) => url.endsWith('players') ? ++attempts === 1 ? json({ error: 'steam_unavailable' }, 502) : json({ status: 'unavailable', reason: 'not_exposed' }) : json({ status: 'available', data: { total: 10, positive: 8, negative: 2, fetchedAt: 1000 } }));
    vi.stubGlobal('fetch', fetcher); render(<GameCommunity appId="550" />);
    expect(await screen.findByText('80%')).toBeVisible();
    fireEvent.click(await screen.findByRole('button', { name: 'Retry player count' }));
    expect(await screen.findByText('Steam did not expose a player count for this game.')).toBeVisible();
    expect(screen.getByText('80%')).toBeVisible();
    expect(fetcher.mock.calls.filter(([url]) => url.endsWith('reviews'))).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Read reviews on Steam ↗' })).toHaveAttribute('href', 'https://store.steampowered.com/app/550/#app_reviews_hash');
  });
});
