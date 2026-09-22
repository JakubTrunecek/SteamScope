import { useState } from 'react';
import type { Game, GamesResult, ProfileResult } from '../../shared/api';
import { useApi } from './api';

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div role="alert"><p>{message}</p><button onClick={retry}>Try again</button></div>;
}
const hours = (minutes: number | null) => minutes === null ? 'Not available' : minutes > 0 && minutes < 6 ? `${minutes} min` : `${(minutes / 60).toLocaleString(undefined, { maximumFractionDigits: 1 })} h`;
const unavailable = <p>Steam did not expose this data. Game details may be private or otherwise unavailable.</p>;

function GameList({ id, games, recent = false }: { id: string; games: Game[]; recent?: boolean }) {
  return <ul className="game-list">{games.map(game => <li key={game.appId}>
    <a href={`#/profile/${id}/game/${game.appId}`}>{game.name}</a>
    <span>{hours(recent ? game.recentMinutes : game.playtimeMinutes)}<small>{recent ? 'last 2 weeks' : 'total playtime'}</small></span>
  </li>)}</ul>;
}

function ProfileCard({ id }: { id: string }) {
  const { state, retry } = useApi<ProfileResult>(`/api/players/${id}/profile`);
  return <section className="card"><h2>Steam profile</h2>
    {state.status === 'loading' ? <p role="status">Loading profile…</p>
      : state.status === 'error' ? <ErrorState message={state.message} retry={retry} />
      : state.data.status === 'unavailable' ? <p>Steam did not return a profile for this ID.</p>
      : <><h3 className="profile-name">{state.data.name}</h3>
        <p>Profile visibility: {state.data.visibility}. Game details have separate privacy settings.</p>
        <a href={`https://steamcommunity.com/profiles/${id}/`} target="_blank" rel="noreferrer">View on Steam ↗</a></>}
  </section>;
}

function LibrarySummary({ id }: { id: string }) {
  const { state, retry } = useApi<GamesResult>(`/api/players/${id}/library`);
  const result = state.status === 'ready' && state.data.status === 'available' ? state.data : null;
  const allTimeKnown = result?.games.every(game => game.playtimeMinutes !== null);
  return <section className="card"><h2>Library at a glance</h2>
    {state.status === 'loading' ? <p role="status">Loading library…</p>
      : state.status === 'error' ? <ErrorState message={state.message} retry={retry} />
      : !result ? unavailable
      : <><div className="metrics"><p><strong>{result.total.toLocaleString()}</strong> games returned</p>
        <p><strong>{allTimeKnown ? hours(result.games.reduce((sum, game) => sum + (game.playtimeMinutes ?? 0), 0)) : 'Not available'}</strong> total playtime</p></div>
        <p className="muted">Includes played free games. Counts reflect what Steam makes visible now.</p></>}
    <a href={`#/profile/${id}/library`}>Explore library →</a>
  </section>;
}

function RecentGames({ id }: { id: string }) {
  const { state, retry } = useApi<GamesResult>(`/api/players/${id}/recent`);
  return <section className="card section"><h2>Recently played</h2><p className="muted">Playtime over the last two weeks.</p>
    {state.status === 'loading' ? <p role="status">Loading recent games…</p>
      : state.status === 'error' ? <ErrorState message={state.message} retry={retry} />
      : state.data.status === 'unavailable' ? unavailable
      : state.data.total === 0 ? <p>Steam reports no recently played games.</p>
      : <GameList id={id} games={[...state.data.games].sort((a, b) => (b.recentMinutes ?? -1) - (a.recentMinutes ?? -1))} recent />}
  </section>;
}

export function Overview({ id }: { id: string }) {
  return <><div className="grid"><ProfileCard id={id} /><LibrarySummary id={id} /></div><RecentGames id={id} /></>;
}

export function Library({ id }: { id: string }) {
  const { state, retry } = useApi<GamesResult>(`/api/players/${id}/library`);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('time');
  if (state.status === 'loading') return <section className="card" role="status">Loading your library…</section>;
  if (state.status === 'error') return <section className="card"><ErrorState message={state.message} retry={retry} /></section>;
  if (state.data.status === 'unavailable') return <section className="card">{unavailable}</section>;
  const games = state.data.games.filter(game => game.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : (b.playtimeMinutes ?? -1) - (a.playtimeMinutes ?? -1) || a.name.localeCompare(b.name));
  return <section className="card">
    <div className="library-tools"><div><label htmlFor="game-search">Find a game</label><input id="game-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search your library" /></div>
      <div><label htmlFor="game-sort">Sort by</label><select id="game-sort" value={sort} onChange={event => setSort(event.target.value)}><option value="time">Most played</option><option value="name">Name A–Z</option></select></div></div>
    <p className="muted" role="status">{games.length} of {state.data.total} games</p>
    {state.data.total === 0 ? <p>Steam reports an empty library.</p> : games.length === 0 ? <p>No games match your search.</p> : <GameList id={id} games={games} />}
  </section>;
}

export function GameSummary({ id, appId }: { id: string; appId: number }) {
  const { state, retry } = useApi<GamesResult>(`/api/players/${id}/library`);
  const game = state.status === 'ready' && state.data.status === 'available' ? state.data.games.find(item => item.appId === appId) : undefined;
  return <section className="card">
    {state.status === 'loading' ? <p role="status">Loading game information…</p>
      : state.status === 'error' ? <ErrorState message={state.message} retry={retry} />
      : state.data.status === 'unavailable' ? unavailable
      : !game ? <><h2>App {appId}</h2><p>This game was not returned in this player's visible library.</p></>
      : <><h2>{game.name}</h2><p>{hours(game.playtimeMinutes)} total playtime</p><a href={`https://store.steampowered.com/app/${appId}/`} target="_blank" rel="noreferrer">View on Steam ↗</a></>}
  </section>;
}
