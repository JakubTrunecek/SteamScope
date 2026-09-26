import { useMemo, useRef, useState } from 'react';
import type { ScannedGame } from './collectionInsights';
import { collectionAchievements, collectionCsv, explorerDefaults, filterCollection, type ExplorerFilters } from './collectionExplorerModel';
import { downloadCsv } from './export';
import { unlockRange } from './searchFilters';

export function AchievementExplorer({ rows, id, totalGames }: { rows: ScannedGame[]; id: string; totalGames: number }) {
  const [filters, setFilters] = useState({ ...explorerDefaults });
  const [shown, setShown] = useState(30);
  const heading = useRef<HTMLHeadingElement>(null);
  const items = useMemo(() => collectionAchievements(rows), [rows]);
  const results = useMemo(() => filterCollection(items, filters), [items, filters]);
  const valid = unlockRange(filters.from, filters.to).valid;
  const update = (patch: Partial<ExplorerFilters>) => { setFilters(previous => ({ ...previous, ...patch })); setShown(30); };
  const preset = (patch: Partial<ExplorerFilters>) => { setFilters({ ...explorerDefaults, ...patch }); setShown(30); heading.current?.focus(); };
  return <section className="section" aria-labelledby="explorer-title">
    <h3 id="explorer-title">Achievement Explorer</h3>
    <p className="muted">Search every achievement returned by loaded games. Coverage: {rows.length} of {totalGames} games checked. Missing or unavailable games contribute no rows. Rarity is not difficulty; these counts do not measure overall game completion.</p>
    <div className="result-actions"><button onClick={() => preset({ state: 'unlocked', order: 'rare' })}>Explore all rarest unlocks</button><button onClick={() => preset({ state: 'unlocked', order: 'recent', dated: true })}>Explore all latest unlocks</button></div>
    <div className="library-tools">
      <div><label htmlFor="explorer-search">Search loaded achievements</label><input id="explorer-search" value={filters.query} onChange={event => update({ query: event.target.value })} placeholder="Achievement, internal name or game" /></div>
      <div><label htmlFor="explorer-game">Loaded game</label><select id="explorer-game" value={filters.game} onChange={event => update({ game: event.target.value })}><option value="all">All loaded games</option>{rows.filter(row => row.achievements?.length).slice().sort((a, b) => a.game.name.localeCompare(b.game.name)).map(row => <option key={row.game.appId} value={row.game.appId}>{row.game.name}</option>)}</select></div>
      <div><label htmlFor="explorer-state">Unlock status</label><select id="explorer-state" value={filters.state} onChange={event => update({ state: event.target.value })}><option value="all">All</option><option value="unlocked">Unlocked</option><option value="locked">Locked</option></select></div>
      <div><label htmlFor="explorer-rarity">Collection global unlock rate</label><select id="explorer-rarity" value={filters.rarity} onChange={event => update({ rarity: event.target.value })}><option value="all">Any rate</option><option value="1">1% or less</option><option value="5">5% or less</option><option value="10">10% or less</option><option value="unknown">Rate unavailable</option></select></div>
      <div><label htmlFor="explorer-order">Order collection achievements</label><select id="explorer-order" value={filters.order} onChange={event => update({ order: event.target.value })}><option value="name">Name A–Z</option><option value="game">Game A–Z</option><option value="rare">Rarest first</option><option value="recent">Latest unlocks first</option></select></div>
    </div>
    <fieldset className="range-filters"><legend>Collection unlock dates (UTC, inclusive)</legend><div><label htmlFor="explorer-from">Collection from date</label><input id="explorer-from" type="date" value={filters.from} aria-invalid={!valid} onChange={event => update({ from: event.target.value })} /></div><div><label htmlFor="explorer-to">Collection through date</label><input id="explorer-to" type="date" value={filters.to} aria-invalid={!valid} onChange={event => update({ to: event.target.value })} /></div></fieldset>
    <label className="checkbox-label"><input type="checkbox" checked={filters.dated} onChange={event => update({ dated: event.target.checked })} />Only unlocks with a known date</label>
    <p className="muted">Date limits exclude locked and undated achievements. Unknown rates sort last by rarity; locked and undated rows sort last by latest unlock.</p>
    {!valid && <p role="alert">Enter a start date no later than the end date.</p>}
    <h4 ref={heading} tabIndex={-1}>Collection results</h4>
    <p role="status">{results.length} of {items.length} loaded achievements match · showing {Math.min(shown, results.length)}</p>
    <div className="result-actions"><button disabled={!results.length} onClick={() => downloadCsv(`steamscope-${id}-collection-achievements.csv`, collectionCsv(results))}>Export {results.length} collection achievements to CSV</button><button onClick={() => preset({})}>Reset collection filters</button></div>
    <p className="muted">Export includes all matching rows in this order, even those not yet shown. Missing metadata stays blank. No additional Steam requests.</p>
    {results.length === 0 ? <p>No loaded achievements match these filters.</p> : <ul className="achievement-list">{results.slice(0, shown).map(item => <li key={`${item.game.appId}-${item.name}`}><div><h4>{item.label}</h4><code>{item.name}</code><p><a href={`#/profile/${id}/game/${item.game.appId}`}>{item.game.name}</a></p><p className="muted">{item.date ? `Unlocked ${item.date.replace('T', ' ').replace('.000Z', ' UTC')}` : item.achieved ? 'Unlock date unavailable' : 'Not unlocked'}</p></div><div className="achievement-status"><strong>{item.achieved ? 'Unlocked' : 'Locked'}</strong><small>{item.percent === undefined ? 'Global rate unavailable' : `${item.percent}% of players globally`}</small></div></li>)}</ul>}
    {results.length > shown && <button onClick={() => setShown(value => value + 30)}>Show more collection achievements</button>}
  </section>;
}
