import { summarizeYear } from './achievementActivity';

export function AchievementYear({ days, month, onMonth }: { days: [string, number][]; month: string; onMonth: (month: string, focus: boolean) => void }) {
  const years = [...new Set(days.map(([day]) => day.slice(0, 4)))].sort().reverse();
  if (!years.length) return null;
  const year = years.includes(month.slice(0, 4)) ? month.slice(0, 4) : years[0];
  const summary = summarizeYear(days, year);
  const maximum = Math.max(1, ...summary.months.map(item => item.count));
  return <section className="achievement-year" aria-labelledby="achievement-year-title">
    <h3 id="achievement-year-title">Your achievement year</h3>
    <label htmlFor="achievement-year">Year (UTC)</label><select id="achievement-year" value={year} onChange={event => {
      const latest = days.filter(([day]) => day.startsWith(`${event.target.value}-`)).map(([day]) => day.slice(0, 7)).sort().at(-1)!;
      onMonth(latest, false);
    }}>{years.map(value => <option key={value}>{value}</option>)}</select>
    <p className="muted">Only dated unlocks in loaded games. These are achievement days, not days played. Missing dates are excluded; loading more games can change every total.</p>
    <dl className="year-metrics"><div><dt>Unlocks in {year}</dt><dd>{summary.total.toLocaleString()}</dd></div><div><dt>Days with unlocks</dt><dd>{summary.activeDays}</dd></div><div><dt>Longest daily streak</dt><dd>{summary.streak} {summary.streak === 1 ? 'day' : 'days'}</dd></div><div><dt>Most unlocks in a day</dt><dd>{summary.best?.count ?? 0}</dd></div></dl>
    {summary.best && <p className="muted">Best day: {summary.best.date} UTC. Equal counts use the earliest day. Streaks count consecutive UTC dates within this year only.</p>}
    <ul className="month-chart" aria-label={`Monthly achievement unlocks in ${year}`}>{summary.months.map(item => <li key={item.month}>
      <button type="button" disabled={item.count === 0} aria-label={`${item.month}: ${item.count} unlocks, open calendar`} aria-controls="unlock-month" aria-pressed={month === item.month} onClick={() => onMonth(item.month, true)}>
        <span>{new Date(`${item.month}-01T00:00:00Z`).toLocaleString(undefined, { month: 'short', timeZone: 'UTC' })}</span><span className="month-track" aria-hidden="true"><span style={{ width: `${100 * item.count / maximum}%` }} /></span><strong>{item.count}</strong>
      </button>
    </li>)}</ul><p className="muted">Choose a month with unlocks to open its calendar. Zero means no dated unlocks in the loaded results.</p>
  </section>;
}
