import { useState } from 'react';
import { AchievementCollection } from './AchievementCollection';
import { compareReviews, matchesReviews, reviewPercent, useLibraryReviews } from './libraryReviews';
import type { Game, GamesResult, ProfileResult, ReviewsResult } from '../../shared/api';
import { useApi } from './api';
import { gamePosition } from './gameInsights';
import { LibraryInsights, TimeChart, time } from './Insights';

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div role="alert"><p>{message}</p><button onClick={retry}>Try again</button></div>;
}
const hours = (minutes: number | null) => minutes === null ? 'Not available' : minutes > 0 && minutes < 6 ? `${minutes} min` : `${(minutes / 60).toLocaleString(undefined, { maximumFractionDigits: 1 })} h`;
const unavailable = <p>Steam did not expose this data. Game details may be private or otherwise unavailable.</p>;

function ReviewLabel({ result }: { result: ReviewsResult | undefined }) {
  if (!result) return <small className="library-review">Reviews not loaded</small>;
  if (result.status === 'unavailable') return <small className="library-review">Reviews unavailable</small>;
  return <small className="library-review">{result.data.total === 0 ? 'No reviews in this selection' : `${reviewPercent(result)!.toLocaleString(undefined, { maximumFractionDigits: 1 })}% positive · ${result.data.total.toLocaleString()} reviews`}<br />Snapshot: {new Date(result.data.fetchedAt).toLocaleString()}</small>;
}

function GameList({ id, games, recent = false, reviews }: { id: string; games: Game[]; recent?: boolean; reviews?: Map<number, ReviewsResult> }) {
  return <ul className="game-list">{games.map(game => <li key={game.appId}>
    <div><a href={`#/profile/${id}/game/${game.appId}`}>{game.name}</a>{reviews && <ReviewLabel result={reviews.get(game.appId)} />}</div>
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
  return <><div className="grid"><ProfileCard id={id} /><section className="card"><h2>Library at a glance</h2>
    {state.status === 'loading' ? <p role="status">Loading library…</p>
      : state.status === 'error' ? <ErrorState message={state.message} retry={retry} />
      : !result ? unavailable
      : <><div className="metrics"><p><strong>{result.total.toLocaleString()}</strong> games returned</p>
        <p><strong>{allTimeKnown ? hours(result.games.reduce((sum, game) => sum + (game.playtimeMinutes ?? 0), 0)) : 'Not available'}</strong> total playtime</p></div>
        <p className="muted">Includes played free games. Counts reflect what Steam makes visible now.</p></>}
    <a href={`#/profile/${id}/library`}>Explore library →</a>
  </section></div>{result && <><LibraryInsights games={result.games} id={id} /><AchievementCollection key={id} games={result.games} id={id} /></>}</>;
}

function RecentGames({ id }: { id: string }) {
  const { state, retry } = useApi<GamesResult>(`/api/players/${id}/recent`);
  return <section className="card section"><h2>Recently played</h2><p className="muted">Playtime over the last two weeks.</p>
    {state.status === 'loading' ? <p role="status">Loading recent games…</p>
      : state.status === 'error' ? <ErrorState message={state.message} retry={retry} />
      : state.data.status === 'unavailable' ? unavailable
      : state.data.total === 0 ? <p>Steam reports no recently played games.</p>
      : <><p className="recent-total"><strong>{state.data.games.every(game => game.recentMinutes === null) ? 'Not available' : time(state.data.games.reduce((sum, game) => sum + (game.recentMinutes ?? 0), 0))}</strong> recorded over the last two weeks · {state.data.games.length} games</p><TimeChart games={state.data.games} id={id} recent /><p className="muted">Chart shows up to five games with positive recent time. Missing times are excluded.</p><details><summary>All recently played games</summary><GameList id={id} games={[...state.data.games].sort((a, b) => (b.recentMinutes ?? -1) - (a.recentMinutes ?? -1))} recent /></details></>}
  </section>;
}

export function Overview({ id }: { id: string }) {
  return <><LibrarySummary id={id} /><RecentGames id={id} /></>;
}

export function Library({ id }: { id: string }) {
  const { state, retry } = useApi<GamesResult>(`/api/players/${id}/library`);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('time');
  const [group, setGroup] = useState('all');
  const [rating, setRating] = useState('all');
  const [minimum, setMinimum] = useState(0);
  const community = useLibraryReviews(id);
  if (state.status === 'loading') return <section className="card" role="status">Loading your library…</section>;
  if (state.status === 'error') return <section className="card"><ErrorState message={state.message} retry={retry} /></section>;
  if (state.data.status === 'unavailable') return <section className="card">{unavailable}</section>;
  const candidates = state.data.games.filter(game => group === 'all' || (group === 'zero' ? game.playtimeMinutes === 0 : group === 'sampled' ? game.playtimeMinutes !== null && game.playtimeMinutes > 0 && game.playtimeMinutes < 120 : group === 'invested' ? game.playtimeMinutes !== null && game.playtimeMinutes >= 120 : game.playtimeMinutes === null)).filter(game => game.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => sort === 'reviews' ? compareReviews(a, b, community.reviews) : sort === 'name' ? a.name.localeCompare(b.name) : (b.playtimeMinutes ?? -1) - (a.playtimeMinutes ?? -1) || a.name.localeCompare(b.name));
  const games = candidates.filter(game => matchesReviews(community.reviews.get(game.appId), rating, minimum));
  const checked = candidates.filter(game => community.reviews.has(game.appId)).length;
  return <><LibraryInsights games={state.data.games} id={id} compact /><section className="card section">
    <div className="library-tools"><div><label htmlFor="game-search">Find a game</label><input id="game-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search your library" /></div>
      <div><label htmlFor="game-sort">Sort by</label><select id="game-sort" value={sort} onChange={event => setSort(event.target.value)}><option value="time">Most played</option><option value="name">Name A–Z</option><option value="reviews">Positive reviews: high to low</option></select></div><div><label htmlFor="playtime-group">Playtime group</label><select id="playtime-group" value={group} onChange={event => setGroup(event.target.value)}><option value="all">All games</option><option value="zero">0 minutes recorded</option><option value="sampled">1–119 minutes</option><option value="invested">120+ minutes</option><option value="unknown">Time unavailable</option></select></div></div>
    <div className="review-discovery"><h2>Discover by community reviews</h2><p className="muted">Choose a playtime group above, then load reviews for up to five matching games. Review filters below apply to loaded data only; loading still covers games matching your name and playtime filters. A running batch keeps the selection it started with.</p><div className="library-tools"><div><label htmlFor="review-threshold">Positive reviews</label><select id="review-threshold" value={rating} onChange={event => setRating(event.target.value)}><option value="all">Any / not loaded</option><option value="0">Any known percentage</option><option value="80">At least 80%</option><option value="90">At least 90%</option><option value="95">At least 95%</option></select></div><div><label htmlFor="review-minimum">Minimum review count</label><select id="review-minimum" value={minimum} onChange={event => setMinimum(Number(event.target.value))}><option value={0}>No minimum</option><option value={100}>100 reviews</option><option value={1000}>1,000 reviews</option><option value={10000}>10,000 reviews</option></select></div></div><div className="result-actions"><button disabled={community.running || checked === candidates.length} onClick={() => void community.load(candidates)}>Load reviews for next 5 games</button>{community.running && <button onClick={community.stop}>Stop loading reviews</button>}<button onClick={() => { setRating('all'); setMinimum(0); }}>Reset review filters</button></div><p role="status">{checked} of {candidates.length} matching games checked for reviews</p><p role="status">{community.message}</p><p className="muted">All languages and purchase types; Steam filters off-topic activity. Percentages are not adjusted for sample size. Equal percentages sort by review count; unknown percentages sort last. Snapshots stay in this tab for up to 500 games until reload.</p></div>
    <p className="muted" role="status">{games.length} of {state.data.total} games</p>
    {state.data.total === 0 ? <p>Steam reports an empty library.</p> : games.length === 0 ? <p>No games match your search.</p> : <GameList id={id} games={games} reviews={community.reviews} />}
  </section></>;
}

export function GameSummary({ id, appId }: { id: string; appId: number }) {
  const { state, retry } = useApi<GamesResult>(`/api/players/${id}/library`);
  const game = state.status === 'ready' && state.data.status === 'available' ? state.data.games.find(item => item.appId === appId) : undefined;
  const position = state.status === 'ready' && state.data.status === 'available' ? gamePosition(state.data.games, appId) : null;
  return <section className="card">
    {state.status === 'loading' ? <p role="status">Loading game information…</p>
      : state.status === 'error' ? <ErrorState message={state.message} retry={retry} />
      : state.data.status === 'unavailable' ? unavailable
      : !game ? <><h2>App {appId}</h2><p>This game was not returned in this player's visible library.</p></>
      : <><h2>{game.name}</h2><div className="game-metrics"><p><strong>{hours(game.playtimeMinutes)}</strong><span>Total playtime</span></p><p><strong>{position?.rank ? `#${position.rank}` : '—'}</strong><span>By time in your returned library</span></p><p><strong>{position?.share !== null && position?.share !== undefined ? `${position.share.toLocaleString(undefined, { maximumFractionDigits: 1 })}%` : '—'}</strong><span>Of known recorded library time</span></p></div><p className="muted">Equal playtimes share a rank. Games with missing time are excluded; games with zero time are not ranked. {position?.unknown ?? 0} games have unknown time.</p><a href={`https://store.steampowered.com/app/${appId}/`} target="_blank" rel="noreferrer">View on Steam ↗</a></>}
  </section>;
}
