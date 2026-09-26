import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { App } from '../src/App';
it('keeps the form after not-found, retries, and ignores a stale resolution after editing', async () => {
 history.replaceState(null, '', '/#/');
 let resolveOld!: (response: Response) => void;
 let count = 0;
 vi.stubGlobal('fetch', vi.fn(async (url: string) => {
  if (!url.includes('/resolve/')) return new Response(JSON.stringify({ status: 'ok', service: 'steamscope-worker' }));
  count++;
  if (count === 1) return new Response(JSON.stringify({ status: 'unavailable', reason: 'not_found' }));
  return new Promise<Response>(resolve => { resolveOld = resolve; });
 }));
 render(<App />);
 const field = screen.getByLabelText('SteamID64 or profile link');
 fireEvent.change(field, { target: { value: 'https://steamcommunity.com/id/example' } });
 fireEvent.click(screen.getByRole('button', { name: 'Explore profile →' }));
 expect(await screen.findByRole('alert')).toHaveTextContent('could not find');
 fireEvent.click(screen.getByRole('button', { name: 'Explore profile →' }));
 await waitFor(() => expect(screen.getByRole('button', { name: 'Finding profile…' })).toBeDisabled());
 fireEvent.change(field, { target: { value: 'https://steamcommunity.com/id/another' } });
 await act(async () => resolveOld(new Response(JSON.stringify({ status: 'available', steamId: '76561198004260198' }))));
 expect(location.hash).toBe('#/');
 expect(field).toHaveValue('https://steamcommunity.com/id/another');
 expect(screen.getByRole('button', { name: 'Explore profile →' })).toBeEnabled();
});
it('navigates only after receiving a valid resolved individual ID', async () => {
 history.replaceState(null, '', '/#/');
 vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('/resolve/') ? { status: 'available', steamId: '76561198004260198' } : url.endsWith('/health') ? { status: 'ok', service: 'steamscope-worker' } : { status: 'unavailable', reason: 'not_found' }))));
 render(<App />);
 fireEvent.change(screen.getByLabelText('SteamID64 or profile link'), { target: { value: 'https://steamcommunity.com/id/example' } });
 fireEvent.click(screen.getByRole('button', { name: 'Explore profile →' }));
 expect(await screen.findByRole('heading', { name: 'Profile Overview' })).toBeVisible();
 expect(location.hash).toBe('#/profile/76561198004260198');
});
