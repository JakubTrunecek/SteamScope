import type { Achievement, SchemaAchievement } from '../../shared/api';

export function numberRange(minimum: string, maximum: string) {
  const parse = (text: string) => text.trim() === '' ? null : /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text.trim()) ? Number(text) : NaN;
  const min = parse(minimum), max = parse(maximum);
  const valid = (min === null || Number.isFinite(min)) && (max === null || Number.isFinite(max)) && (min === null || max === null || min <= max);
  return { valid, matches: (value: number) => valid && (min === null || value >= min) && (max === null || value <= max) };
}
export function unlockRange(from: string, to: string) {
  const parse = (text: string) => {
    if (!text) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return NaN;
    const value = Date.parse(`${text}T00:00:00Z`);
    return Number.isFinite(value) && new Date(value).toISOString().slice(0, 10) === text ? value / 1000 : NaN;
  };
  const start = parse(from), end = parse(to);
  const valid = (start === null || Number.isFinite(start)) && (end === null || Number.isFinite(end)) && (start === null || end === null || start <= end);
  return { valid, matches: (item: Achievement) => valid && (!from && !to || item.achieved && item.unlockTime !== null && item.unlockTime > 0 && (start === null || item.unlockTime >= start) && (end === null || item.unlockTime < end + 86400)) };
}
export function achievementMatches(item: Achievement, info: SchemaAchievement | undefined, query: string) {
  const description = info?.hidden && !item.achieved ? '' : info?.description ?? '';
  return `${item.name} ${info?.displayName ?? ''} ${description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}
