import { useEffect, useState } from 'react';
import type { AchievementsResult, Capability, GameSchema, GlobalResult, SchemaResult, StatsResult } from '../../shared/api';
import { useApi } from './api';
import { AchievementHighlights } from './AchievementHighlights';
import { numberRange, unlockRange, achievementMatches } from './searchFilters';
import { sortAchievements } from './gameInsights';
import { achievementsCsv, statsCsv, downloadCsv } from './export';

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
  const [hideZero, setHideZero] = useState(false);
  const [minimum, setMinimum] = useState('');
  const [maximum, setMaximum] = useState('');
  const range = numberRange(minimum, maximum);
  const labels = new Map(schema?.stats?.map(stat => [stat.name, stat.displayName]));
  const result = state.status === 'ready' && state.data.status === 'available' ? state.data.data : null;
  const filtered = result?.filter(stat => range.matches(stat.value) && (!hideZero || stat.value !== 0) && `${stat.name} ${labels.get(stat.name) ?? ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => sort === 'value' ? b.value - a.value || a.name.localeCompare(b.name) : sort === 'ascending' ? a.value - b.value || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)) ?? [];
  return <section className="card section" aria-labelledby="stats-title"><h2 id="stats-title" tabIndex={-1}>Detailed Stats</h2>
    <p className="muted">Values reported by this game. Original stat names are preserved; labels appear only when Steam supplies them. Values may use different units.</p>
    {state.status === 'loading' ? <p role="status">Loading statistics…</p>
      : state.status === 'error' ? <Failure message={state.message} retry={retry} />
      : state.data.status === 'unavailable' ? <Unavailable reason={state.data.reason} />
      : result?.length === 0 ? <p>Steam returned an empty statistics list for this player and game.</p>
      : <><div className="library-tools"><div><label htmlFor="stat-search">Find a statistic</label><input id="stat-search" value={query} onChange={event => { setQuery(event.target.value); setShown(50); }} placeholder="Search original names or supplied labels" /></div>
        <div><label htmlFor="stat-sort">Sort statistics</label><select id="stat-sort" value={sort} onChange={event => { setSort(event.target.value); setShown(50); }}><option value="name">Original name A–Z</option><option value="value">Value: high to low</option><option value="ascending">Value: low to high</option></select></div></div>
        <fieldset className="range-filters"><legend>Value range (inclusive)</legend><div><label htmlFor="stat-min">Minimum value</label><input id="stat-min" inputMode="decimal" value={minimum} aria-invalid={!range.valid} aria-describedby="stat-range-help" onChange={event => { setMinimum(event.target.value); setShown(50); }} placeholder="No minimum" /></div><div><label htmlFor="stat-max">Maximum value</label><input id="stat-max" inputMode="decimal" value={maximum} aria-invalid={!range.valid} aria-describedby="stat-range-help" onChange={event => { setMaximum(event.target.value); setShown(50); }} placeholder="No maximum" /></div></fieldset><p className="muted" id="stat-range-help">Use a decimal point, for example -1.25. Blank limits are unrestricted. Values may represent different units.</p>{!range.valid && <p role="alert">Enter valid numbers with the minimum no greater than the maximum.</p>}<label className="checkbox-label"><input type="checkbox" checked={hideZero} onChange={event => { setHideZero(event.target.checked); setShown(50); }} /> Hide zero values</label><p className="muted">{result?.filter(stat => stat.value !== 0).length} nonzero values · {result?.filter(stat => stat.value === 0).length} zero values. Nonzero does not imply progress or importance.</p><p className="muted" role="status">{filtered.length} of {result?.length} statistics · showing {Math.min(shown, filtered.length)}</p>
        <div className="result-actions"><button disabled={!filtered.length} onClick={() => downloadCsv(`steamscope-${id}-${appId}-stats.csv`, statsCsv(filtered, labels))}>Export {filtered.length} statistics to CSV</button><button onClick={() => { setQuery(''); setMinimum(''); setMaximum(''); setHideZero(false); setSort('name'); setShown(50); }}>Reset statistics filters</button></div><p className="muted">Exports all matching rows in the current order, including rows not yet shown. Missing metadata stays blank.</p>{filtered.length === 0 ? <p>No statistics match your search.</p> : <div className="table-wrap"><table className="stats-table"><thead><tr><th scope="col">Statistic</th><th scope="col">Value</th></tr></thead><tbody>
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
  const [order, setOrder] = useState('steam');
  const [rarity, setRarity] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const dates = unlockRange(from, to);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  useEffect(() => { if (selectedName !== null) { const heading = document.getElementById('achievement-results'); heading?.focus(); heading?.scrollIntoView({ block: 'start' }); } }, [selectedName]);
  const [shown, setShown] = useState(30);
  const metadata = new Map(schema?.achievements?.map(item => [item.name, item]));
  const percentages = new Map(global.state.status === 'ready' && global.state.data.status === 'available' ? global.state.data.data.map(item => [item.name, item.percent]) : []);
  const result = state.status === 'ready' && state.data.status === 'available' ? state.data.data : null;
  const unlocked = result?.filter(item => item.achieved).length ?? 0;
  const filtered = sortAchievements(result?.filter(item => dates.matches(item) && (selectedName === null || item.name === selectedName) && (rarity === 'all' || (rarity === 'unknown' ? !percentages.has(item.name) : percentages.has(item.name) && percentages.get(item.name)! <= Number(rarity))) && (filter === 'all' || item.achieved === (filter === 'unlocked')) && achievementMatches(item, metadata.get(item.name), query)) ?? [], order, percentages, metadata);
  return <section className="card section" aria-labelledby="achievements-title"><h2 id="achievements-title" tabIndex={-1}>Achievements</h2>
    {state.status === 'loading' ? <p role="status">Loading achievements…</p>
      : state.status === 'error' ? <Failure message={state.message} retry={retry} />
      : state.data.status === 'unavailable' ? <Unavailable reason={state.data.reason} />
      : result?.length === 0 ? <p>Steam returned an empty achievements list for this player and game.</p>
      : <><p><strong>{unlocked} / {result?.length}</strong> returned achievements unlocked in this game</p>
        <progress aria-label="Unlocked achievements in this game" value={unlocked} max={result?.length || 1} />
        <AchievementHighlights items={result ?? []} rates={percentages} metadata={metadata} onSelect={name => { setSelectedName(name); setQuery(''); setFilter('all'); setRarity('all'); setFrom(''); setTo(''); setShown(30); }} /><div className="library-tools section"><div><label htmlFor="achievement-search">Find an achievement</label><input id="achievement-search" value={query} onChange={event => { setQuery(event.target.value); setSelectedName(null); setShown(30); }} placeholder="Search names or visible descriptions" /></div>
          <div><label htmlFor="achievement-filter">Show achievements</label><select id="achievement-filter" value={filter} onChange={event => { setFilter(event.target.value); setShown(30); }}><option value="all">All</option><option value="unlocked">Unlocked</option><option value="locked">Locked</option></select></div><div><label htmlFor="achievement-order">Sort achievements</label><select id="achievement-order" value={order} onChange={event => { setOrder(event.target.value); setShown(30); }}><option value="steam">Steam order</option><option value="rare">Rarest first</option><option value="recent">Latest unlocks first</option><option value="name">Name A–Z</option></select></div><div><label htmlFor="achievement-rarity">Global unlock rate</label><select id="achievement-rarity" value={rarity} onChange={event => { setRarity(event.target.value); setShown(30); }}><option value="all">Any rate</option><option value="1">1% or less</option><option value="5">5% or less</option><option value="10">10% or less</option><option value="unknown">Rate unavailable</option></select></div></div>{order === 'rare' && <p className="muted">Lowest available global rates first; unknown rates last. Rarity is not difficulty.</p>}{order === 'recent' && <p className="muted">Dated unlocks first; locked and undated achievements last.</p>}
        <fieldset className="range-filters"><legend>Unlocked during (UTC)</legend><div><label htmlFor="unlock-from">From date</label><input id="unlock-from" type="date" value={from} aria-invalid={!dates.valid} aria-describedby="unlock-range-help" onChange={event => { setFrom(event.target.value); setShown(30); }} /></div><div><label htmlFor="unlock-to">Through date</label><input id="unlock-to" type="date" value={to} aria-invalid={!dates.valid} aria-describedby="unlock-range-help" onChange={event => { setTo(event.target.value); setShown(30); }} /></div></fieldset><p className="muted" id="unlock-range-help">Both dates are inclusive in UTC. Setting either date excludes locked achievements and unlocks without a known date. Blank dates leave all results eligible.</p>{!dates.valid && <p role="alert">Enter valid dates with the start no later than the end.</p>}<h3 id="achievement-results" tabIndex={-1}>Achievement results</h3>{selectedName !== null && <p>Selected achievement: <code>{selectedName}</code></p>}<div className="result-actions"><button disabled={!filtered.length} onClick={() => downloadCsv(`steamscope-${id}-${appId}-achievements.csv`, achievementsCsv(filtered, metadata, percentages))}>Export {filtered.length} achievements to CSV</button><button onClick={() => { setSelectedName(null); setQuery(''); setFilter('all'); setRarity('all'); setOrder('steam'); setShown(30); }}>Reset achievement filters</button></div><p className="muted">Exports all matching achievements in the current order. Dates use UTC; missing data and hidden locked descriptions stay blank.</p><p className="muted" role="status">{filtered.length} matches · showing {Math.min(shown, filtered.length)}</p>
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
    <nav className="section" aria-label="Game sections">{[['achievements-title', 'Achievements'], ['stats-title', 'Detailed Stats']].map(([target, label]) => <button key={target} onClick={() => { const heading = document.getElementById(target); heading?.focus(); heading?.scrollIntoView({ block: 'start' }); }}>{label}</button>)}</nav>
    <div className="section muted" role="status">{schema.state.status === 'loading' ? 'Loading game labels…'
      : schema.state.status === 'error' ? <><p>Game labels could not be loaded. Original names remain available.</p><button onClick={schema.retry}>Retry game labels</button></>
      : metadata ? 'Game labels supplied by Steam. Missing labels retain their original names.' : 'Steam did not expose game labels. Original names are shown.'}</div>
    <Achievements id={id} appId={appId} schema={metadata} />
    <Stats id={id} appId={appId} schema={metadata} />
  </>;
}
