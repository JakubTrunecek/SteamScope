import type { Achievement, SchemaAchievement } from '../../shared/api';

export function achievementHighlights(items: Achievement[], rates: Map<string, number>) {
  const rarity = (a: Achievement, b: Achievement) => rates.get(a.name)! - rates.get(b.name)! || a.name.localeCompare(b.name);
  return {
    rare: items.filter(item => item.achieved && rates.has(item.name)).sort(rarity).slice(0, 3),
    locked: items.filter(item => !item.achieved && rates.has(item.name)).sort(rarity).slice(0, 3),
    recent: items.filter(item => item.achieved && item.unlockTime !== null && item.unlockTime > 0).sort((a, b) => b.unlockTime! - a.unlockTime! || a.name.localeCompare(b.name)).slice(0, 3),
  };
}

export function AchievementHighlights({ items, rates, metadata, onSelect }: { onSelect: (name: string) => void; items: Achievement[]; rates: Map<string, number>; metadata: Map<string, SchemaAchievement> }) {
  const highlights = achievementHighlights(items, rates);
  return <section aria-label="Achievement highlights" className="section">
    <h3>Standout achievements</h3>
    <p className="muted">Highlights within this game. Rarity uses the available global unlock rates; it does not measure difficulty.</p>
    <div className="highlight-grid">{([
      ['Rarest unlocked', highlights.rare, 'No unlocked achievements with a global rate available.'],
      ['Latest unlocks', highlights.recent, 'No dated unlocks available.'],
      ['Rare and still locked', highlights.locked, 'No locked achievements with a global rate available.'],
    ] as const).map(([title, list, empty]) => <article key={title} className="highlight-card"><h4>{title}</h4>
      {list.length === 0 ? <p className="muted">{empty}</p> : <ol>{list.map(item => <li key={item.name}>
        <button className="highlight-link" onClick={() => onSelect(item.name)}>{metadata.get(item.name)?.displayName ?? item.name}</button>
        <span>{title === 'Latest unlocks' ? new Date(item.unlockTime! * 1000).toLocaleDateString() : `${rates.get(item.name)!.toLocaleString(undefined, { maximumFractionDigits: 2 })}% global unlock rate`}</span>
      </li>)}</ol>}
    </article>)}</div>
  </section>;
}
