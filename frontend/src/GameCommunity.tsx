import type { CurrentPlayersResult, ReviewsResult } from '../../shared/api';
import { useApi } from './api';

function Snapshot({ at }: { at: number }) {
  return <p className="muted">Snapshot: {new Date(at).toLocaleString()} · may be cached for up to a minute.</p>;
}
function CurrentPlayers({ appId }: { appId: string }) {
  const { state, retry } = useApi<CurrentPlayersResult>(`/api/games/${appId}/players`);
  return <section className="card" aria-labelledby="current-players"><h2 id="current-players">Playing now</h2>
    <p className="muted">Players currently in this game and connected to Steam. Offline players are excluded.</p>
    {state.status === 'loading' ? <p role="status">Loading player count…</p> : state.status === 'error' ? <><p role="alert">{state.message}</p><button onClick={retry}>Retry player count</button></> : state.data.status === 'unavailable' ? <p>Steam did not expose a player count for this game.</p> : <><p className="community-value">{state.data.data.count.toLocaleString()}</p><p>concurrent players</p><Snapshot at={state.data.data.fetchedAt} /></>}
  </section>;
}
function Reviews({ appId }: { appId: string }) {
  const { state, retry } = useApi<ReviewsResult>(`/api/games/${appId}/reviews`);
  const result = state.status === 'ready' && state.data.status === 'available' ? state.data.data : null;
  return <section className="card" aria-labelledby="community-reviews"><h2 id="community-reviews">Community reviews</h2>
    {state.status === 'loading' ? <p role="status">Loading review summary…</p> : state.status === 'error' ? <><p role="alert">{state.message}</p><button onClick={retry}>Retry review summary</button></> : !result ? <p>Steam did not expose a review summary for this game.</p> : <>{result.total === 0 ? <p>No reviews in this selection yet.</p> : <><p className="community-value">{(100 * result.positive / result.total).toLocaleString(undefined, { maximumFractionDigits: 1 })}%</p><p>positive across {result.total.toLocaleString()} reviews</p><p className="muted">{result.positive.toLocaleString()} positive · {result.negative.toLocaleString()} negative</p></>}<Snapshot at={result.fetchedAt} /></>}
    <p className="muted">All languages and purchase types, all-time totals. Steam's off-topic activity filter is enabled. This selection may differ from the store's headline rating.</p>
    <a href={`https://store.steampowered.com/app/${appId}/#app_reviews_hash`} target="_blank" rel="noreferrer">Read reviews on Steam ↗</a>
  </section>;
}
export function GameCommunity({ appId }: { appId: string }) {
  return <div className="grid section"><CurrentPlayers appId={appId} /><Reviews appId={appId} /></div>;
}
