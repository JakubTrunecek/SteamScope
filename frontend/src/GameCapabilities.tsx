import { useState } from 'react';
import type { AchievementsResult, Capability, GameSchema, GlobalResult, SchemaResult, StatsResult } from '../../shared/api';
import { useApi } from './api';

function Unavailable({ reason }: { reason: Extract<Capability<unknown>, { status: 'unavailable' }>['reason'] }) {
  return <p>{reason === 'private' ? 'Steam reports that this profile is not public.'
    : reason === 'unsupported' ? 'Steam reports that this app has no stats for this request.'
    : 'Steam did not expose this data. Availability could not be established.'}</p>;
}
function Failure({ message, retry }: { message: string; retry: () => void }) {
  return <div role="alert"><p>{message}</p><button onClick={retry}>Try again</button></div>;
}
function Stats({ id, appId, schema }: { id: string; appId: string; schema: GameSchema | null }) {
  const { state, retry } = useApi<StatsResult>(`/api/players/${id}/games/${appId}/stats`);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');
  const [shown, setShown] = useState(50);
  const labels = new Map(schema?.stats?.map(stat => [stat.name, stat.displayName]));
  const result = state.status === 'ready' && state.data.status === 'available' ? state.data.data : null;
  const filtered = result?.filter(stat => `${stat.name} ${labels.get(stat.name) ?? ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => sort === 'value' ? b.value - a.value || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)) ?? [];
  return <section className="card section" aria-labelledby="stats-title"><h2 id="stats-title">Detailed Stats</h2>
    <p className="muted">Values reported by this game. Original stat names are preserved; labels appear only when Steam supplies them. Values may use different units.</p>
    {state.status === 'loading' ? <p role="status">Loading statistics…</p>
      : state.status === 'error' ? <Failure message={state.message} retry={retry} />
      : state.data.status === 'unavailable' ? <Unavailable reason={state.data.reason} />
      : result?.length === 0 ? <p>Steam returned an empty statistics list for this player and game.</p>
      : <><div className="library-tools"><div><label htmlFor="stat-search">Find a statistic</label><input id="stat-search" value={query} onChange={event => { setQuery(event.target.value); setShown(50); }} placeholder="Search original names or supplied labels" /></div>
        <div><label htmlFor="stat-sort">Sort statistics</label><select id="stat-sort" value={sort} onChange={event => { setSort(event.target.value); setShown(50); }}><option value="name">Original name A–Z</option><option value="value">Value: high to low</option></select></div></div>
        <p className="muted" role="status">{filtered.length} of {result?.length} statistics · showing {Math.min(shown, filtered.length)}</p>
        {filtered.length === 0 ? <p>No statistics match your search.</p> : <div className="table-wrap"><table className="stats-table"><thead><tr><th scope="col">Statistic</th><th scope="col">Value</th></tr></thead><tbody>
          {filtered.slice(0, shown).map(stat => <tr key={stat.name}><th scope="row">{labels.get(stat.name) && <span className="stat-label">{labels.get(stat.name)}</span>}<code>{stat.name}</code></th><td>{String(stat.value)}</td></tr>)}
        </tbody></table></div>}
        {shown < filtered.length && <button className="load-more" onClick={() => setShown(value => value + 50)}>Show more statistics</button>}
      </>}
  </section>;
}
function Achievements({ id, appId, schema }: { id: string; appId: string; schema: GameSchema | null }) {
  const { state, retry } = useApi<AchievementsResult>(`/api/players/${id}/games/${appId}/achievements`);
  const global = useApi<GlobalResult>(`/api/players/${id}/games/${appId}/global`);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [shown, setShown] = useState(30);
  const metadata = new Map(schema?.achievements?.map(item => [item.name, item]));
  const percentages = new Map(global.state.status === 'ready' && global.state.data.status === 'available' ? global.state.data.data.map(item => [item.name, item.percent]) : []);
  const result = state.status === 'ready' && state.data.status === 'available' ? state.data.data : null;
  const unlocked = result?.filter(item => item.achieved).length ?? 0;
  const filtered = result?.filter(item => (filter === 'all' || item.achieved === (filter === 'unlocked')) && `${item.name} ${metadata.get(item.name)?.displayName ?? ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) ?? [];
  return <section className="card section" aria-labelledby="achievements-title"><h2 id="achievements-title">Achievements</h2>
    {state.status === 'loading' ? <p role="status">Loading achievements…</p>
      : state.status === 'error' ? <Failure message={state.message} retry={retry} />
      : state.data.status === 'unavailable' ? <Unavailable reason={state.data.reason} />
      : result?.length === 0 ? <p>Steam returned an empty achievements list for this player and game.</p>
      : <><p><strong>{unlocked} / {result?.length}</strong> returned achievements unlocked in this game</p>
        <progress aria-label="Unlocked achievements in this game" value={unlocked} max={result?.length || 1} />
        <div className="library-tools section"><div><label htmlFor="achievement-search">Find an achievement</label><input id="achievement-search" value={query} onChange={event => { setQuery(event.target.value); setShown(30); }} placeholder="Search names" /></div>
          <div><label htmlFor="achievement-filter">Show achievements</label><select id="achievement-filter" value={filter} onChange={event => { setFilter(event.target.value); setShown(30); }}><option value="all">All</option><option value="unlocked">Unlocked</option><option value="locked">Locked</option></select></div></div>
        <p className="muted" role="status">{filtered.length} matches · showing {Math.min(shown, filtered.length)}</p>
        {filtered.length === 0 ? <p>No achievements match your filters.</p> : <ul className="achievement-list">{filtered.slice(0, shown).map(item => {
          const info = metadata.get(item.name);
          const percent = percentages.get(item.name);
          return <li key={item.name}><div><h3>{info?.displayName ?? item.name}</h3>{info?.displayName && <code>{item.name}</code>}
            {info?.hidden && !item.achieved ? <p className="muted">Hidden achievement. Description is revealed after unlocking.</p> : info?.description && <p>{info.description}</p>}
            {item.achieved && item.unlockTime !== null && <p className="muted">Unlocked {new Date(item.unlockTime * 1000).toLocaleDateString()}</p>}</div>
            <div className="achievement-status"><strong>{item.achieved ? 'Unlocked' : 'Locked'}</strong><small>{percent === undefined ? 'Global rate unavailable' : `${percent.toLocaleString(undefined, { maximumFractionDigits: 2 })}% of players globally`}</small></div></li>;
        })}</ul>}
        {shown < filtered.length && <button className="load-more" onClick={() => setShown(value => value + 30)}>Show more achievements</button>}
      </>}
    <div className="muted section">
      {global.state.status === 'loading' ? <p role="status">Loading global unlock percentages…</p>
        : global.state.status === 'error' ? <><p>Global percentages could not be loaded. Your achievements are independent of this data.</p><Failure message={global.state.message} retry={global.retry} /></>
        : global.state.data.status === 'unavailable' ? <p>Global percentages are not exposed for this game.</p>
        : <p>Global percentages describe Steam players, not your progress across other games.</p>}
    </div>
  </section>;
}
export function GameCapabilities({ id, appId }: { id: string; appId: string }) {
  const schema = useApi<SchemaResult>(`/api/players/${id}/games/${appId}/schema`);
  const metadata = schema.state.status === 'ready' && schema.state.data.status === 'available' ? schema.state.data.data : null;
  return <>
    <div className="section muted" role="status">{schema.state.status === 'loading' ? 'Loading game labels…'
      : schema.state.status === 'error' ? <><p>Game labels could not be loaded. Original names remain available.</p><button onClick={schema.retry}>Retry game labels</button></>
      : metadata ? 'Game labels supplied by Steam. Missing labels retain their original names.' : 'Steam did not expose game labels. Original names are shown.'}</div>
    <Achievements id={id} appId={appId} schema={metadata} />
    <Stats id={id} appId={appId} schema={metadata} />
  </>;
}
