import type { Achievement, DetailedStat, SchemaAchievement } from '../../shared/api';

type Cell = string | number | boolean | null | undefined;
export function csv(rows: Cell[][]): string {
  return '\uFEFF' + rows.map(row => row.map(value => {
    let text = value == null ? '' : String(value);
    // Prevent spreadsheet formulas in untrusted Steam labels, without changing numbers.
    if (typeof value === 'string' && /^[\s\uFEFF]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  }).join(',')).join('\r\n') + '\r\n';
}
export function statsCsv(items: DetailedStat[], labels: Map<string, string | null>) {
  return csv([['internal_name', 'steam_label', 'value'], ...items.map(item => [item.name, labels.get(item.name), item.value])]);
}
export function achievementsCsv(items: Achievement[], metadata: Map<string, SchemaAchievement>, rates: Map<string, number>) {
  return csv([['internal_name', 'steam_label', 'unlocked', 'unlock_time_utc', 'global_percent', 'description'], ...items.map(item => {
    const info = metadata.get(item.name);
    return [item.name, info?.displayName, item.achieved, item.achieved && item.unlockTime !== null && item.unlockTime > 0 ? new Date(item.unlockTime * 1000).toISOString() : null,
      rates.get(item.name), info?.hidden && !item.achieved ? null : info?.description];
  })]);
}
export function downloadCsv(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
