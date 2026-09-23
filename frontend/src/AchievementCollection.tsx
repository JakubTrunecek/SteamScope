import { useEffect, useRef, useState } from 'react';
import type { AchievementsResult, Game, GlobalResult, SchemaResult } from '../../shared/api';
import { collectionInsights, type ScannedGame } from './collectionInsights';
import { clearCollection, readCollection, saveCollection } from './collectionSession';

export function AchievementCollection({ id, games }: { id: string; games: Game[] }) {
  const [rows, setRows] = useState<ScannedGame[]>(() => readCollection(id).rows.filter(row => games.some(game => game.appId === row.game.appId)));
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [month, setMonth] = useState(() => readCollection(id).month);
  const [day, setDay] = useState(() => readCollection(id).day);
  const [dayShown, setDayShown] = useState(30);
  useEffect(() => { saveCollection(id, { rows, month, day }); }, [id, rows, month, day]);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => { active.current?.abort(); }, []);
  const insights = collectionInsights(rows);
  const months = [...new Set(insights.days.map(([day]) => day.slice(0, 7)))];
  const selectedMonth = months.includes(month) ? month : months[0];
  const dailyUnlocks = insights.dated.filter(item => new Date(item.unlockTime! * 1000).toISOString().slice(0, 10) === day);
  async function scan() {
    if (active.current) return;
    const controller = new AbortController(); active.current = controller; setRunning(true); setMessage('');
    const queue = [...games].filter(game => !rows.some(row => row.game.appId === game.appId)).sort((a, b) => (b.playtimeMinutes ?? -1) - (a.playtimeMinutes ?? -1)).slice(0, 5);
    async function request<T>(appId: number, kind: string): Promise<T> {
      // Pace every request below the proxy's per-IP budget, including metadata.
      await new Promise<void>((resolve, reject) => {
        const abort = () => { clearTimeout(timer); reject(new Error('Stopped')); };
        const timer = setTimeout(() => { controller.signal.removeEventListener('abort', abort); resolve(); }, 2500);
        controller.signal.addEventListener('abort', abort, { once: true });
        if (controller.signal.aborted) abort();
      });
      const base = import.meta.env.VITE_API_BASE_URL;
      if (!base) throw new Error('Backend is not configured.');
      const response = await fetch(`${base.replace(/\/$/, '')}/api/players/${id}/games/${appId}/${kind}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]) });
      if (!response.ok) throw new Error(response.status === 429 ? 'Request limit reached. Wait a minute, then continue.' : 'Steam could not be reached. Continue to retry the unfinished game.');
      return await response.json() as T;
    }
    try {
      for (const game of queue) {
        setMessage(`Loading ${game.name}…`);
        const result = await request<AchievementsResult>(game.appId, 'achievements');
        const row: ScannedGame = { game, achievements: result.status === 'available' ? result.data : null, labels: Object.create(null), percentages: Object.create(null) };
        if (row.achievements?.length) {
          const schema = await request<SchemaResult>(game.appId, 'schema');
          const global = await request<GlobalResult>(game.appId, 'global');
          if (schema.status === 'available') for (const item of schema.data.achievements ?? []) if (item.displayName) row.labels[item.name] = item.displayName;
          if (global.status === 'available') for (const item of global.data) row.percentages[item.name] = item.percent;
        }
        if (!controller.signal.aborted) setRows(previous => [...previous, row]);
      }
      setMessage('Batch finished. You can load the next five games.');
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Unable to load achievements.');
    } finally {
      if (active.current === controller) { active.current = null; setRunning(false); }
    }
  }
  const link = (game: Game) => `#/profile/${id}/game/${game.appId}`;
  return <section className="card section"><h2>Achievements across your library</h2>
    <p>Discover your rarest unlocks, completed games and achievement calendar. Load five games at a time, most played first.</p>
    <p className="muted">Results cover only loaded games. Your last three explored profiles stay in this tab while you navigate; reloading clears them. Saved results are a snapshot, not live tracking. This is achievement activity, not hours played. Dates use UTC.</p>
    <p role="status">{rows.length} of {games.length} games checked · {insights.supported} with achievements · {rows.filter(row => row.achievements === null).length} unavailable · {rows.filter(row => row.achievements?.length === 0).length} empty lists</p>
    <div className="result-actions"><button disabled={running || rows.length === games.length} onClick={() => void scan()}>{rows.length ? 'Load next 5 games' : 'Explore achievements'}</button>{running && <button onClick={() => { active.current?.abort(); setMessage('Stopped. Completed games are kept; continue whenever you like.'); }}>Stop loading</button>}{rows.length > 0 && <button disabled={running} onClick={() => { clearCollection(id); setRows([]); setMonth(''); setDay(''); setDayShown(30); setMessage('Results cleared. Explore again to fetch a new snapshot.'); }}>Clear loaded results</button>}</div>
    <p role="status">{message}</p>
    {!!rows.length && <><p><strong>{insights.unlocked}</strong> unlocked achievements in loaded games · {insights.undated} without a usable date</p>
      <div className="grid"><div><h3>Rarest unlocked</h3><p className="muted">Among loaded achievements with known global percentages. Rarity is not difficulty.</p><ul>{insights.rarest.map(item => <li key={`${item.game.appId}-${item.name}`}><a href={link(item.game)}>{item.label}</a> — {item.game.name} · {item.percent}%</li>)}</ul>{!insights.rarest.length && <p>No unlocked achievements with known rarity.</p>}</div>
      <div><h3>Latest unlocks</h3><ul>{insights.latest.map(item => <li key={`${item.game.appId}-${item.name}`}><a href={link(item.game)}>{item.label}</a> — {item.game.name} · {new Date(item.unlockTime! * 1000).toISOString().slice(0, 10)}</li>)}</ul>{!insights.latest.length && <p>No dated unlocks available.</p>}</div></div>
      <h3>Completed and nearly completed</h3><p className="muted">Games with at least one achievement and no more than five remaining. Counts describe achievements, not overall game progress.</p><ul>{insights.completion.filter(item => item.remaining <= 5).map(item => <li key={item.game.appId}><a href={link(item.game)}>{item.game.name}</a> — {item.total - item.remaining}/{item.total} unlocked · {item.remaining === 0 ? 'All unlocked' : `${item.remaining} remaining`}</li>)}</ul>{!insights.completion.some(item => item.remaining <= 5) && <p>No matching games among the loaded results.</p>}
      <h3>Unlock calendar</h3>{months.length ? <><label htmlFor="unlock-month">Month (UTC)</label><select id="unlock-month" value={selectedMonth} onChange={event => { setMonth(event.target.value); setDay(''); setDayShown(30); }}>{months.map(value => <option key={value}>{value}</option>)}</select><div className="unlock-calendar">{Array.from({ length: new Date(Date.UTC(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5)), 0)).getUTCDate() }, (_, index) => { const date = `${selectedMonth}-${String(index + 1).padStart(2, '0')}`; const count = insights.days.find(([dateKey]) => dateKey === date)?.[1] ?? 0; return <button type="button" className={count ? 'calendar-day active' : 'calendar-day'} key={date} aria-label={`${date}: ${count} unlocks`} aria-pressed={day === date} aria-controls="daily-unlocks" onClick={() => { setMonth(selectedMonth); setDay(date); setDayShown(30); }}><span>{index + 1}</span><strong>{count}</strong><span className="muted">unlocks</span></button>; })}</div><p className="muted">Choose a day to see its unlocks. Zero means no dated unlocks in the loaded results for that day. Missing dates are excluded.</p><section id="daily-unlocks" aria-label="Selected day achievements">{day ? <><h4>{day} · UTC</h4><p role="status">{dailyUnlocks.length} unlocks in loaded games</p><ul className="daily-unlocks">{dailyUnlocks.slice(0, dayShown).map(item => <li key={`${item.game.appId}-${item.name}`}><a href={link(item.game)}>{item.label}</a><span>{item.game.name} · {new Date(item.unlockTime! * 1000).toISOString().slice(11, 19)} UTC</span></li>)}</ul>{dailyUnlocks.length === 0 && <p>No dated unlocks on this day in the loaded results.</p>}{dailyUnlocks.length > dayShown && <button onClick={() => setDayShown(value => value + 30)}>Show more unlocks</button>}</> : <p>Select a day above.</p>}</section></> : <p>No dated unlocks available for the calendar.</p>}
    </>}
  </section>;
}
