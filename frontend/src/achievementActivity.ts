// Input is the collection's one-entry-per-UTC-date aggregation.
export function summarizeYear(days: [string, number][], year: string) {
  const selected = days.filter(([day]) => day.startsWith(`${year}-`)).sort(([a], [b]) => a.localeCompare(b));
  const months = Array.from({ length: 12 }, (_, index) => ({ month: `${year}-${String(index + 1).padStart(2, '0')}`, count: 0 }));
  let total = 0, streak = 0, current = 0, previous: number | null = null;
  let best: { date: string; count: number } | null = null;
  for (const [date, count] of selected) {
    if (count <= 0) continue;
    total += count;
    months[Number(date.slice(5, 7)) - 1].count += count;
    const timestamp = Date.parse(`${date}T00:00:00Z`);
    current = previous !== null && timestamp - previous === 86400000 ? current + 1 : 1;
    streak = Math.max(streak, current); previous = timestamp;
    if (!best || count > best.count) best = { date, count };
  }
  return { total, activeDays: selected.filter(([, count]) => count > 0).length, streak, best, months };
}
