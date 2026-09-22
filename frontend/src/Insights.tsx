import type { Game } from '../../shared/api';

export const time = (minutes: number) => minutes < 60 ? `${minutes} min` : `${(minutes / 60).toLocaleString(undefined, { maximumFractionDigits: 1 })} h`;
export function summarize(games: Game[]) {
  const known = games.filter(game => game.playtimeMinutes !== null);
  const played = known.filter(game => game.playtimeMinutes! > 0);
  const ranked = [...played].sort((a, b) => b.playtimeMinutes! - a.playtimeMinutes! || a.name.localeCompare(b.name));
  const total = known.reduce((sum, game) => sum + game.playtimeMinutes!, 0);
  return { ranked, total, unknown: games.length - known.length, zero: known.length - played.length,
    sampled: played.filter(game => game.playtimeMinutes! < 120).length,
    invested: played.filter(game => game.playtimeMinutes! >= 120).length,
    share: total > 0 ? ranked.slice(0, 5).reduce((sum, game) => sum + game.playtimeMinutes!, 0) / total * 100 : null };
}

export function TimeChart({ games, id, recent = false }: { games: Game[]; id: string; recent?: boolean }) {
  const value = (game: Game) => (recent ? game.recentMinutes : game.playtimeMinutes) ?? 0;
  const sorted = [...games].filter(game => value(game) > 0).sort((a, b) => value(b) - value(a) || a.name.localeCompare(b.name));
  const total = sorted.reduce((sum, game) => sum + value(game), 0);
  return <ol className="time-chart">{sorted.slice(0, 5).map(game => <li key={game.appId}>
    <div><a href={`#/profile/${id}/game/${game.appId}`}>{game.name}</a><strong>{time(value(game))}</strong></div>
    <div className="bar-track" aria-hidden="true"><div style={{ width: `${value(game) / value(sorted[0]) * 100}%` }} /></div>
    <small>{(value(game) / total * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}% of returned {recent ? 'recent' : 'recorded'} playtime</small>
  </li>)}</ol>;
}

export function LibraryInsights({ games, id, compact = false }: { games: Game[]; id: string; compact?: boolean }) {
  const summary = summarize(games);
  if (!games.length) return null;
  return <section className="section" aria-label="Playtime insights">
    <div className="insight-metrics">
      <div><span className="eyebrow">RECORDED PLAYTIME</span><strong>{summary.unknown === games.length ? 'Not available' : time(summary.total)}</strong><span>across {games.length - summary.unknown} games with known time</span></div>
      <div><span className="eyebrow">{summary.ranked.length ? `YOUR TOP ${Math.min(5, summary.ranked.length)}` : 'TOP GAMES'}</span><strong>{summary.share === null ? '—' : `${Math.round(summary.share)}%`}</strong><span>of recorded playtime in your most-played games</span></div>
    </div>
    <div className="insight-layout">
      {!compact && <section className="card"><h2>Where your time goes</h2><p className="muted">Your five most-played games. Bars compare their recorded hours.</p>{summary.ranked.length ? <TimeChart games={games} id={id} /> : <p>No positive playtime was returned.</p>}</section>}
      <section className="card"><h2>Your library by playtime</h2><div className="library-buckets">
        <div><strong>{summary.zero}</strong><span>No recorded time</span><small>0 minutes</small></div>
        <div><strong>{summary.sampled}</strong><span>Briefly explored</span><small>1–119 minutes</small></div>
        <div><strong>{summary.invested}</strong><span>Two hours or more</span><small>120+ minutes</small></div>
        {summary.unknown > 0 && <div><strong>{summary.unknown}</strong><span>Time unavailable</span><small>Excluded from time calculations</small></div>}
      </div><p className="muted">Based on the returned library, including played free games. Zero recorded time does not prove a game was never played. These groups describe playtime, not completion.</p></section>
    </div>
  </section>;
}
