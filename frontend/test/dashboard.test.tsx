import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AchievementCollection } from '../src/AchievementCollection';
import { clearCollection, readCollection, saveCollection } from '../src/collectionSession';
it('shows one dashboard view, retains explorer filters while switching and restores the view on return', () => {
  const id = 'dashboard-test';
  const game = { appId: 1, name: 'Game', playtimeMinutes: 1, recentMinutes: null };
  clearCollection(id);
  saveCollection(id, { month: '', day: '', rows: [{ game, labels: {}, percentages: {}, achievements: [{ name: 'First', achieved: true, unlockTime: 1709251199 }, { name: 'Second', achieved: false, unlockTime: null }] }] });
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  let view = render(<AchievementCollection id={id} games={[game]} />);
  expect(screen.getByRole('region', { name: 'Achievement highlights' })).toBeVisible();
  expect(screen.queryByRole('region', { name: 'Achievement activity' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Achievement Explorer' }));
  fireEvent.change(screen.getByLabelText('Search loaded achievements'), { target: { value: 'First' } });
  fireEvent.click(screen.getByRole('button', { name: 'Highlights' }));
  expect(screen.queryByRole('region', { name: 'Explore collection' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Achievement Explorer' }));
  expect(screen.getByLabelText('Search loaded achievements')).toHaveValue('First');
  expect(within(screen.getByRole('region', { name: 'Explore collection' })).getByText('1 of 2 loaded achievements match · showing 1')).toBeVisible();
  expect(readCollection(id).view).toBe('explorer');
  view.unmount(); view = render(<AchievementCollection id={id} games={[game]} />);
  expect(screen.getByRole('button', { name: 'Achievement Explorer' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Clear loaded results' }));
  expect(screen.queryByRole('group', { name: 'Achievement dashboard views' })).not.toBeInTheDocument();
  expect(fetcher).not.toHaveBeenCalled();
  view.unmount(); clearCollection(id);
});

