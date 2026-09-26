import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AchievementExplorer } from '../src/AchievementExplorer';
import { collectionAchievements, collectionCsv, explorerDefaults, filterCollection } from '../src/collectionExplorerModel';
import type { ScannedGame } from '../src/collectionInsights';
import * as exports from '../src/export';
const game = { appId: 1, name: 'Alpha', playtimeMinutes: 1, recentMinutes: null };
const rows: ScannedGame[] = [
  { game, labels: { SAME: '=First' }, percentages: { SAME: 0 }, achievements: [{ name: 'SAME', achieved: true, unlockTime: 1709251199 }, { name: 'UNDATED', achieved: true, unlockTime: 0 }] },
  { game: { ...game, appId: 2, name: 'Beta' }, labels: { SAME: 'Second' }, percentages: { SAME: 5 }, achievements: [{ name: 'SAME', achieved: false, unlockTime: 1709251199 }] },
  { game: { ...game, appId: 3 }, labels: {}, percentages: {}, achievements: null },
];
it('keeps identical internal names isolated by game and preserves zero/unknown metadata', () => {
  const items = collectionAchievements(rows);
  expect(items).toHaveLength(3);
  expect(filterCollection(items, { ...explorerDefaults, order: 'rare' }).map(item => item.label)).toEqual(['=First', 'Second', 'UNDATED']);
  expect(filterCollection(items, { ...explorerDefaults, rarity: 'unknown' }).map(item => item.name)).toEqual(['UNDATED']);
  expect(filterCollection(items, { ...explorerDefaults, game: '2', rarity: '5', state: 'locked', query: 'beta' })).toHaveLength(1);
  expect(filterCollection(items, { ...explorerDefaults, from: '2024-02-29', to: '2024-02-29' })).toHaveLength(1);
  expect(filterCollection(items, { ...explorerDefaults, from: '2024-03-01', to: '2024-02-29' })).toHaveLength(0);
  const output = collectionCsv(items);
  expect(output).toContain('"1","Alpha","SAME","\'=First","true","2024-02-29T23:59:59.000Z","0"');
  expect(output).toContain('"2","Beta","SAME","Second","false","","5"');
  expect(output).toContain('"UNDATED","","true","",""');
});
it('combines UI filters, resets dates, and focuses complete highlight results without requests', () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  render(<AchievementExplorer rows={rows} id="test" totalGames={10} />);
  fireEvent.change(screen.getByLabelText('Unlock status'), { target: { value: 'locked' } });
  fireEvent.change(screen.getByLabelText('Loaded game'), { target: { value: '2' } });
  expect(screen.getByText('1 of 3 loaded achievements match · showing 1')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Beta' })).toHaveAttribute('href', '#/profile/test/game/2');
  fireEvent.change(screen.getByLabelText('Collection from date'), { target: { value: '2025-01-01' } });
  expect(screen.getByText('No loaded achievements match these filters.')).toBeVisible();
  fireEvent.click(screen.getByText('Explore all latest unlocks'));
  expect(screen.getByRole('heading', { name: 'Collection results' })).toHaveFocus();
  expect(screen.getByLabelText('Collection from date')).toHaveValue('');
  expect(screen.getByText('1 of 3 loaded achievements match · showing 1')).toBeVisible();
  fireEvent.click(screen.getByText('Reset collection filters'));
  expect(screen.getByText('3 of 3 loaded achievements match · showing 3')).toBeVisible();
  expect(fetcher).not.toHaveBeenCalled();
});
it('exports all matching rows beyond the displayed page and incorporates newly loaded games', () => {
  const download = vi.spyOn(exports, 'downloadCsv').mockImplementation(() => {});
  const many = { ...rows[0], achievements: Array.from({ length: 35 }, (_, index) => ({ name: `A${index}`, achieved: true, unlockTime: null })) };
  const view = render(<AchievementExplorer rows={[many]} id="test" totalGames={10} />);
  expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(30);
  fireEvent.click(screen.getByText('Export 35 collection achievements to CSV'));
  expect(download.mock.calls[0][1].split('\r\n')).toHaveLength(37);
  fireEvent.click(screen.getByText('Show more collection achievements'));
  expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(35);
  view.rerender(<AchievementExplorer rows={[many, rows[1]]} id="test" totalGames={10} />);
  expect(screen.getByText('36 of 36 loaded achievements match · showing 36')).toBeVisible();
  fireEvent.change(screen.getByLabelText('Search loaded achievements'), { target: { value: 'second' } });
  expect(screen.getByText('1 of 36 loaded achievements match · showing 1')).toBeVisible();
});
