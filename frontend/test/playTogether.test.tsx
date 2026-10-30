import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PlayTogether } from '../src/PlayTogether';
import { sharedLibrary, timeGroup } from '../src/playTogetherModel';
import { clearLibraryCache, readLibraryCache, writeLibraryCache } from '../src/libraryCache';
import type { Game } from '../../shared/api';
const id = '76561198004260198', friend = '76561198004260199';
const game = (appId: number, name: string, minutes: number | null): Game => ({ appId, name, playtimeMinutes: minutes, recentMinutes: null });
const yours = [game(1, 'Alpha', 0), game(2, 'Beta', 120), game(3, 'Gamma', null), game(4, 'Delta', 5), game(5, 'Echo', 120), game(6, 'Only yours', 10)];
const theirs = [game(1, 'Alpha', 10), game(2, 'Beta', 119), game(3, 'Gamma', 0), game(4, 'Delta', 120), game(5, 'Echo', 300), game(7, 'Only yours', 10)];
const json = (body: unknown) => new Response(JSON.stringify(body));
const library = (games: Game[]) => ({ status: 'available', total: games.length, games });
function mock() { return vi.stubGlobal('fetch', vi.fn(async (url: string) => json(library(url.includes(id) ? yours : theirs)))); }
async function loadFriend(user: ReturnType<typeof userEvent.setup>, value = friend) { await user.type(screen.getByLabelText('Friend’s SteamID64 or profile link'), value); await user.click(screen.getByRole('button', { name: 'Load friend' })); }

describe('Play Together', () => {
  it('intersects exact IDs, sorts deterministically and distinguishes threshold and unknown time', () => {
    const shared = sharedLibrary(yours, theirs);
    expect(shared.map(g => g.appId)).toEqual([1, 2, 4, 5, 3]);
    expect(shared.map(timeGroup)).toEqual(['discover', 'you', 'friend', 'return', 'unknown']);
    expect(sharedLibrary([...yours, yours[0]].reverse(), [...theirs].reverse()).map(g => g.appId)).toEqual([1, 2, 4, 5, 3]);
    expect(sharedLibrary([game(2, 'Same', 0), game(1, 'Same', 0)], [game(1, 'Same', 0), game(2, 'Same', 0)]).map(g => g.appId)).toEqual([1, 2]);
  });
  it('keeps pins across views and filters, removes pins on exclusion, and isolates a changed pair', async () => {
    mock(); const user = userEvent.setup(); render(<PlayTogether id={id} />); await loadFriend(user);
    expect(await screen.findByText('5 shared games · 5 matching this view · 0 excluded')).toBeVisible();
    expect(screen.getAllByRole('article')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Pin for tonight Alpha' }));
    expect(screen.getByRole('button', { name: 'Unpin Alpha' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Library map' }));
    expect(screen.getAllByRole('article')).toHaveLength(5);
    const gamma = screen.getByRole('heading', { name: 'Gamma' }).closest('article')!;
    expect(within(gamma).getByText('Unknown')).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Recorded playtime group'), 'unknown');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Remove Alpha from shortlist' })).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Recorded playtime group'), 'all');
    await user.click(screen.getByRole('button', { name: 'Exclude Alpha' }));
    expect(screen.getByRole('heading', { name: 'Your shared-library map' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Remove Alpha from shortlist' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset exclusions (1)' }));
    expect(screen.getAllByRole('article')).toHaveLength(5);
    await user.clear(screen.getByLabelText(/SteamID64 or profile link/));
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    await loadFriend(user);
    expect(await screen.findByRole('heading', { name: 'Tonight’s shortlist (0)' })).toBeVisible();
  });
  it('rejects the same canonical profile after vanity resolution and handles unavailable libraries', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => json(url.includes('/resolve/') ? { status: 'available', steamId: id } : url.includes(friend) ? { status: 'unavailable', reason: 'private_or_unavailable' } : library(yours))));
    const user = userEvent.setup(); render(<PlayTogether id={id} />);
    await loadFriend(user, 'https://steamcommunity.com/id/me');
    expect(await screen.findByRole('alert')).toHaveTextContent('different profile');
    await user.clear(screen.getByLabelText(/SteamID64 or profile link/)); await loadFriend(user);
    expect(await screen.findByText(/Your friend’s library is private or unavailable/)).toBeVisible();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });
  it('bounds map rendering and expands the chosen group', async () => {
    const large = Array.from({ length: 20 }, (_, n) => game(n + 1, `Game ${n + 1}`, 0));
    vi.stubGlobal('fetch', vi.fn(async () => json(library(large))));
    const user = userEvent.setup(); render(<PlayTogether id={id} />); await loadFriend(user);
    await screen.findByText(/20 shared games.*20 matching this view/);
    await user.click(screen.getByRole('button', { name: 'Library map' }));
    expect(screen.getAllByRole('article')).toHaveLength(6);
    await user.click(screen.getByRole('button', { name: 'Show more: Both under 2 hours' }));
    expect(screen.getAllByRole('article')).toHaveLength(12);
    const more = screen.getByRole('button', { name: 'Show more: Both under 2 hours' });
    await user.click(more); await user.click(more);
    expect(screen.getAllByRole('article')).toHaveLength(20);
    expect(more).toBeDisabled(); expect(more).toHaveFocus();
  });
  it('ignores an outdated vanity resolution after editing the friend input', async () => {
    let finish!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('/resolve/') ? new Promise<Response>(resolve => { finish = resolve; }) : json(library(yours))));
    const user = userEvent.setup(); render(<PlayTogether id={id} />);
    await loadFriend(user, 'https://steamcommunity.com/id/friend');
    await user.clear(screen.getByLabelText(/SteamID64 or profile link/));
    await act(async () => { finish(json({ status: 'available', steamId: friend })); });
    expect(screen.queryByRole('heading', { name: /Friend.*library/ })).not.toBeInTheDocument();
  });
  it('ignores late results from a replaced friend even if transport ignores abort', async () => {
    let finish!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes(friend) ? new Promise<Response>(resolve => { finish = resolve; }) : json(library(yours))));
    const user = userEvent.setup(); render(<PlayTogether id={id} />); await loadFriend(user);
    expect(await screen.findByText('Loading friend’s library…')).toBeVisible();
    await user.clear(screen.getByLabelText(/SteamID64 or profile link/));
    await act(async () => { finish(json(library(theirs))); });
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(readLibraryCache(`/api/players/${friend}/library`)).toBeUndefined();
  });
});
describe('bounded library reuse', () => {
  it('expires after 60 seconds, caps at four profiles, and excludes capabilities / unavailable responses', () => {
    clearLibraryCache(); const path = `/api/players/${id}/library`;
    writeLibraryCache(path, library(yours), 100); expect(readLibraryCache(path, 60099)).toBeDefined(); expect(readLibraryCache(path, 60100)).toBeUndefined();
    writeLibraryCache(path, { status: 'unavailable' }, 100); expect(readLibraryCache(path, 100)).toBeUndefined();
    writeLibraryCache('/api/games/1/stats', library(yours), 100); expect(readLibraryCache('/api/games/1/stats', 100)).toBeUndefined();
    for (let n = 0; n < 5; n++) writeLibraryCache(`/api/players/7656119800426019${n}/library`, library(yours), 100);
    expect(readLibraryCache('/api/players/76561198004260190/library', 100)).toBeUndefined(); expect(readLibraryCache('/api/players/76561198004260194/library', 100)).toBeDefined();
  });
});
