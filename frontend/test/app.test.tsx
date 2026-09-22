import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { Library } from '../src/SteamScreens';
import { GameCapabilities } from '../src/GameCapabilities';

const id = '76561198004260198';
const library = { status: 'available', total: 3, games: [
  { appId: 1, name: 'Alpha', playtimeMinutes: 0, recentMinutes: null },
  { appId: 2, name: 'Beta', playtimeMinutes: 120, recentMinutes: 30 },
  { appId: 3, name: 'Gamma', playtimeMinutes: 1, recentMinutes: null },
] };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
function mockApi(overrides: Record<string, () => Response> = {}) {
  const mock = vi.fn(async (input: string) => {
    const part = input.split('/').at(-1)!;
    if (overrides[part]) return overrides[part]();
    if (part === 'health') return json({ status: 'ok', service: 'steamscope-worker' });
    if (part === 'library') return json(library);
    if (part === 'profile') return json({ status: 'available', steamId: id, name: 'Test Player', visibility: 'public' });
    if (part === 'recent') return json({ status: 'available', total: 0, games: [] });
    if (part === 'stats') return json({ status: 'available', data: [{ name: 'Raw_Name', value: 0 }, { name: 'fraction', value: -1.25 }] });
    if (part === 'achievements') return json({ status: 'available', data: [{ name: 'OPEN', achieved: true, unlockTime: null }, { name: 'SECRET', achieved: false, unlockTime: null }] });
    if (part === 'schema') return json({ status: 'available', data: { stats: [{ name: 'raw_name', displayName: 'Wrong case label' }], achievements: [{ name: 'SECRET', displayName: 'Secret achievement', hidden: true, description: 'Do not reveal me' }] } });
    return json({ status: 'available', data: [{ name: 'OPEN', percent: 0 }] });
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}
describe('Navigation and library interactions', () => {
  it('validates IDs, navigates to a profile and moves focus to the new page', async () => {
    history.replaceState(null, '', '/#/'); mockApi();
    const user = userEvent.setup(); render(<App />);
    await user.click(screen.getByRole('button', { name: 'Explore profile →' }));
    expect(screen.getByRole('alert')).toHaveTextContent('valid 17-digit');
    await user.type(screen.getByLabelText('SteamID64'), id);
    await user.click(screen.getByRole('button', { name: 'Explore profile →' }));
    expect(await screen.findByRole('heading', { name: 'Profile Overview' })).toBeVisible();
    expect(screen.getByRole('main')).toHaveFocus();
    expect(document.title).toBe('Profile Overview · SteamScope');
    expect(await screen.findByText('Test Player')).toBeVisible();
  });
  it('filters, sorts, links to games and preserves small nonzero playtime', async () => {
    mockApi(); const user = userEvent.setup(); render(<Library id={id} />);
    expect(await screen.findByText('3 of 3 games')).toBeVisible();
    const links = () => screen.getAllByRole('link').map(link => link.textContent);
    expect(links()).toEqual(['Beta', 'Gamma', 'Alpha']);
    expect(screen.getByText('1 min')).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Sort by'), 'name');
    expect(links()).toEqual(['Alpha', 'Beta', 'Gamma']);
    await user.type(screen.getByLabelText('Find a game'), 'BETA');
    expect(links()).toEqual(['Beta']);
    expect(screen.getByRole('link', { name: 'Beta' })).toHaveAttribute('href', `#/profile/${id}/game/2`);
    await user.type(screen.getByLabelText('Find a game'), 'zzz');
    expect(screen.getByText('No games match your search.')).toBeVisible();
  });
  it('separates unavailable and empty libraries', async () => {
    mockApi({ library: () => json({ status: 'unavailable', reason: 'private_or_unavailable' }) });
    const { unmount } = render(<Library id={id} />);
    expect(await screen.findByText(/may be private/)).toBeVisible(); unmount();
    mockApi({ library: () => json({ status: 'available', total: 0, games: [] }) });
    render(<Library id={id} />);
    expect(await screen.findByText('Steam reports an empty library.')).toBeVisible();
  });
  it('retries failures without displaying raw error codes', async () => {
    let fail = true;
    mockApi({ library: () => fail ? json({ error: 'rate_limited' }, 429) : json(library) });
    const user = userEvent.setup(); render(<Library id={id} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('wait a minute');
    fail = false; await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('3 of 3 games')).toBeVisible();
  });
  it('ignores an old request that completes after the player changes', async () => {
    let resolveOld!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn((url: string) => url.includes(id) ? new Promise<Response>(resolve => { resolveOld = resolve; }) : Promise.resolve(json({ status: 'available', total: 0, games: [] }))));
    const view = render(<Library id={id} />);
    view.rerender(<Library id="76561198004260199" />);
    expect(await screen.findByText('Steam reports an empty library.')).toBeVisible();
    await act(async () => resolveOld(json(library)));
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
  });
});
describe('Game detail interactions', () => {
  it('matches labels exactly, preserves values and hides locked descriptions', async () => {
    mockApi(); const user = userEvent.setup(); render(<GameCapabilities id={id} appId="550" />);
    expect(await screen.findByText('Raw_Name')).toBeVisible();
    expect(screen.queryByText('Wrong case label')).not.toBeInTheDocument();
    expect(screen.getByText('-1.25')).toBeVisible();
    expect(await screen.findByText('Secret achievement')).toBeVisible();
    expect(screen.queryByText('Do not reveal me')).not.toBeInTheDocument();
    expect(screen.getByText('0% of players globally')).toBeVisible();
    expect(screen.queryByText(/1970/)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Show achievements'), 'unlocked');
    expect(screen.queryByText('Secret achievement')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Find a statistic'), 'missing');
    expect(screen.getByText('No statistics match your search.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Detailed Stats' }));
    expect(screen.getByRole('heading', { name: 'Detailed Stats' })).toHaveFocus();
  });
  it('keeps player data when schema/global requests fail', async () => {
    mockApi({ schema: () => json({ error: 'steam_timeout' }, 504), global: () => json({ error: 'steam_unavailable' }, 502) });
    render(<GameCapabilities id={id} appId="550" />);
    expect(await screen.findByText('Raw_Name')).toBeVisible();
    expect(await screen.findByText('OPEN')).toBeVisible();
    expect(screen.getByText(/Original names remain available/)).toBeVisible();
    expect(screen.getByText(/Your achievements are independent/)).toBeVisible();
  });
  it('expands long stat lists without changing totals', async () => {
    mockApi({ stats: () => json({ status: 'available', data: Array.from({ length: 75 }, (_, i) => ({ name: `stat_${String(i).padStart(2,'0')}`, value: i })) }) });
    const user = userEvent.setup(); render(<GameCapabilities id={id} appId="550" />);
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(51);
    await user.click(screen.getByRole('button', { name: 'Show more statistics' }));
    await waitFor(() => expect(within(table).getAllByRole('row')).toHaveLength(76));
    expect(screen.queryByRole('button', { name: 'Show more statistics' })).not.toBeInTheDocument();
  });
});
