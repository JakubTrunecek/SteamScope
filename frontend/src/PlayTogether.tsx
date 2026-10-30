import { useEffect, useRef, useState, type FormEvent } from 'react';
import { isSteamId, type GamesResult } from '../../shared/api';
import { useApi } from './api';
import { parseProfileInput } from './profileInput';
import { sharedLibrary, timeGroup, type SharedGame, type TimeGroup } from './playTogetherModel';

const labels: Record<TimeGroup, string> = {
  discover: 'Both under 2 hours', you: 'You 2+ hours · friend under 2',
  friend: 'Friend 2+ hours · you under 2', return: 'Both 2+ hours', unknown: 'Unknown recorded time',
};
const time = (minutes: number | null) => minutes === null ? 'Unknown' : minutes < 120 ? `${minutes} min recorded` : `${(minutes / 60).toLocaleString(undefined, { maximumFractionDigits: 1 })} h recorded`;

export function PlayTogether({ id }: { id: string }) {
  const yours = useApi<GamesResult>(`/api/players/${id}/library`);
  const [input, setInput] = useState('');
  const [friend, setFriend] = useState('');
  const [error, setError] = useState('');
  const [resolving, setResolving] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);
  function cancel() { active.current?.abort(); active.current = null; setResolving(false); }
  async function submit(event: FormEvent) {
    event.preventDefault(); cancel(); setFriend(''); setError('');
    const parsed = parseProfileInput(input);
    if ('error' in parsed) { setError(parsed.error); return; }
    if ('steamId' in parsed) {
      if (parsed.steamId === id) { setError('Choose a different profile to compare with yours.'); return; }
      setFriend(parsed.steamId); return;
    }
    const controller = new AbortController(); active.current = controller; setResolving(true);
    try {
      const base = import.meta.env.VITE_API_BASE_URL;
      if (!base) throw new Error('Backend is not configured.');
      const response = await fetch(`${base.replace(/\/$/, '')}/api/resolve/${encodeURIComponent(parsed.vanity)}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]) });
      if (!response.ok) throw new Error(response.status === 429 ? 'Too many requests. Wait a minute and try again.' : 'Could not resolve your friend’s profile. Try again.');
      const body = await response.json();
      if (active.current !== controller) return;
      if (body?.status === 'unavailable') throw new Error('Steam could not find this custom profile address.');
      if (body?.status !== 'available' || typeof body.steamId !== 'string' || !isSteamId(body.steamId)) throw new Error('Unexpected profile response. Please try again.');
      if (body.steamId === id) throw new Error('Choose a different profile to compare with yours.');
      setFriend(body.steamId);
    } catch (failure) {
      if (active.current === controller) setError(failure instanceof Error && failure.name === 'Error' ? failure.message : 'Could not resolve this profile. Please try again.');
    } finally { if (active.current === controller) { active.current = null; setResolving(false); } }
  }
  return <div className="together">
    <p className="lead">Explore the games in both libraries. Make a small plan for tonight.</p>
    <div className="grid">
      <section className="card"><h2>Your library</h2><p className="together-id">Steam ID {id}</p>
        {yours.state.status === 'loading' ? <p role="status">Loading your library…</p> : yours.state.status === 'error' ? <div role="alert"><p>{yours.state.message}</p><button onClick={yours.retry}>Retry your library</button></div> : yours.state.data.status === 'unavailable' ? <p>Your library is private or unavailable. Shared games cannot be calculated.</p> : <p>{yours.state.data.games.length} games returned</p>}
      </section>
      <section className="card"><h2>Bring a friend</h2><form onSubmit={submit}>
        <label htmlFor="together-friend">Friend’s SteamID64 or profile link</label>
        <div className="input-row"><input id="together-friend" value={input} onChange={event => { cancel(); setInput(event.target.value); setFriend(''); setError(''); }} autoCapitalize="none" spellCheck={false} placeholder="Steam ID or Steam Community profile URL" aria-invalid={Boolean(error)} aria-describedby="together-input-help" /><button disabled={resolving}>{resolving ? 'Finding profile…' : 'Load friend'}</button></div>
        <p id="together-input-help" className="muted">Supports /profiles/ and /id/ links. Editing the profile clears this pair’s selections.</p>
        {error && <p role="alert">{error}</p>}
      </form></section>
    </div>
    <p className="card section">Shared ownership only: multiplayer modes and two-player capacity are unverified. These are library browsing suggestions, not confirmed co-op or taste matches. Check the Steam page before playing.</p>
    <p className="muted">Libraries may be reused for up to 60 seconds in this tab (up to four profiles). Choices stay only on this page; leaving or changing profiles clears them.</p>
    {friend ? <FriendLibrary key={`${id}:${friend}`} id={id} friend={friend} yours={yours.state.status === 'ready' && yours.state.data.status === 'available' ? yours.state.data : null} /> : <p>Add a friend’s profile to find shared games.</p>}
  </div>;
}

function FriendLibrary({ id, friend, yours }: { id: string; friend: string; yours: Extract<GamesResult, { status: 'available' }> | null }) {
  const { state, retry } = useApi<GamesResult>(`/api/players/${friend}/library`);
  return <section className="section"><h2>Friend’s library</h2><p className="together-id">Steam ID {friend}</p>
    {state.status === 'loading' ? <p role="status">Loading friend’s library…</p> : state.status === 'error' ? <div role="alert"><p>{state.message}</p><button onClick={retry}>Retry friend’s library</button></div> : state.data.status === 'unavailable' ? <p>Your friend’s library is private or unavailable. Missing ownership data cannot be treated as an empty library.</p> : <><p>{state.data.games.length} games returned</p>{yours ? <PairResults id={id} games={sharedLibrary(yours.games, state.data.games)} /> : <p>Your library must be available before shared games can be calculated.</p>}</>}
  </section>;
}

function PairResults({ id, games }: { id: string; games: SharedGame[] }) {
  const [view, setView] = useState<'lobby' | 'map'>('lobby');
  const [group, setGroup] = useState<TimeGroup | 'all'>('all');
  const [visible, setVisible] = useState<Record<TimeGroup, number>>({ discover: 6, you: 6, friend: 6, return: 6, unknown: 6 });
  const [pins, setPins] = useState<Set<number>>(new Set());
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const heading = useRef<HTMLHeadingElement>(null);
  const shortlistHeading = useRef<HTMLHeadingElement>(null);
  const focusResults = useRef(false);
  useEffect(() => { if (focusResults.current) { heading.current?.focus(); focusResults.current = false; } }, [excluded]);
  const candidates = games.filter(game => !excluded.has(game.appId) && (group === 'all' || timeGroup(game) === group));
  function togglePin(appId: number) { setPins(current => { const next = new Set(current); if (next.has(appId)) next.delete(appId); else next.add(appId); return next; }); }
  function exclude(appId: number) { setPins(current => new Set([...current].filter(value => value !== appId))); focusResults.current = true; setExcluded(current => new Set([...current, appId])); }
  function card(game: SharedGame) {
    return <article className="card together-game" key={game.appId}><h3>{game.name}</h3><p className="muted">Shared AppID {game.appId} · mode unverified</p>
      <div className="together-times"><p><strong>You</strong>{time(game.you)}</p><p><strong>Friend</strong>{time(game.friend)}</p></div>
      <div className="result-actions"><button aria-label={`${pins.has(game.appId) ? 'Unpin' : 'Pin for tonight'} ${game.name}`} aria-pressed={pins.has(game.appId)} onClick={() => togglePin(game.appId)}>{pins.has(game.appId) ? 'Unpin' : 'Pin for tonight'}</button><button aria-label={`Exclude ${game.name}`} onClick={() => exclude(game.appId)}>Not this session</button></div>
      <p className="together-links"><a href={`#/profile/${id}/game/${game.appId}`} aria-label={`Game details for ${game.name}`}>Game details</a><a href={`https://store.steampowered.com/app/${game.appId}/`} target="_blank" rel="noreferrer" aria-label={`View ${game.name} on Steam`}>Check on Steam ↗</a></p>
    </article>;
  }
  function quadrant(key: TimeGroup) {
    const items = candidates.filter(game => timeGroup(game) === key);
    return <section className={`together-quadrant${key === 'unknown' ? ' section' : ''}`} key={key}><h3>{labels[key]}</h3>
      {items.length ? items.slice(0, visible[key]).map(card) : <p className="muted">No games in this group.</p>}
      {items.length > 0 && <p className="muted">Showing {Math.min(visible[key], items.length)} of {items.length}</p>}
      {items.length > 6 && <button disabled={items.length <= visible[key]} onClick={() => setVisible(current => ({ ...current, [key]: current[key] + 6 }))}>Show more: {labels[key]}</button>}
    </section>;
  }
  return <>
    <section className="card section together-shortlist"><h2 ref={shortlistHeading} tabIndex={-1}>Tonight’s shortlist ({pins.size})</h2><p className="muted">Pins stay across views and filters. Excluding a game removes its pin.</p>{pins.size ? <ul>{games.filter(game => pins.has(game.appId)).map(game => <li key={game.appId}><span>{game.name}</span><button aria-label={`Remove ${game.name} from shortlist`} onClick={() => { togglePin(game.appId); shortlistHeading.current?.focus(); }}>Remove</button></li>)}</ul> : <p>No plans yet. Pin a shared game below.</p>}</section>
    <div className="library-tools section"><div><label htmlFor="together-time">Recorded playtime group</label><select id="together-time" value={group} onChange={event => setGroup(event.target.value as TimeGroup | 'all')}><option value="all">All shared games</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="result-actions" role="group" aria-label="Shared library view"><button aria-pressed={view === 'lobby'} onClick={() => setView('lobby')}>Lobby</button><button aria-pressed={view === 'map'} onClick={() => setView('map')}>Library map</button><button disabled={!excluded.size} onClick={() => { focusResults.current = true; setExcluded(new Set()); }}>Reset exclusions ({excluded.size})</button></div></div>
    <h2 className="section" tabIndex={-1} ref={heading}>{view === 'lobby' ? 'The Lobby' : 'Your shared-library map'}</h2>
    <p role="status">{games.length} shared games · {candidates.length} matching this view · {excluded.size} excluded</p>
    <p className="muted">{view === 'lobby' ? 'Up to three shared games, ordered by title then AppID. No taste ranking yet. Time does not prove enjoyment or experience.' : 'Groups use a 120-minute boundary. Unknown time stays separate; it is never zero.'}</p>
    {!games.length ? <p>No shared AppIDs were returned. Try another friend.</p> : !candidates.length ? <p>No games match this group and your exclusions. Change the group or reset exclusions.</p> : view === 'lobby' ? <div className="together-lobby">{candidates.slice(0, 3).map(card)}</div> : <><div className="together-map">{(['discover', 'you', 'friend', 'return'] as TimeGroup[]).map(quadrant)}</div>{quadrant('unknown')}</>}
  </>;
}
