import { expect, it } from 'vitest';
import { achievementsCsv, csv, statsCsv } from '../src/export';

it('quotes commas, quotes and newlines and neutralizes spreadsheet formulas in labels', () => {
  expect(csv([['a,"b"\nc', '=SUM(A1:A2)', ' \t@formula', -1.25, 0]])).toBe('\uFEFF"a,""b""\nc","\'=SUM(A1:A2)","\' \t@formula","-1.25","0"\r\n');
});
it('exports exact values and exact-name metadata while leaving missing labels blank', () => {
  const result = statsCsv([{ name: 'raw', value: 0.18421052396297455 }, { name: 'RAW', value: -1.25 }], new Map([['RAW', 'Known label']]));
  expect(result).toContain('"raw","","0.18421052396297455"');
  expect(result).toContain('"RAW","Known label","-1.25"');
});
it('exports zero rarity, UTC dates and blanks instead of hidden descriptions or unknown data', () => {
  const result = achievementsCsv([
    { name: 'LOCKED', achieved: false, unlockTime: 30 },
    { name: 'OPEN', achieved: true, unlockTime: 1 },
  ], new Map([['LOCKED', { name: 'LOCKED', displayName: 'Secret', hidden: true, description: 'Spoiler' }]]), new Map([['OPEN', 0]]));
  expect(result).not.toContain('Spoiler');
  expect(result).toContain('"LOCKED","Secret","false","","",""');
  expect(result).toContain('"OPEN","","true","1970-01-01T00:00:01.000Z","0",""');
});
