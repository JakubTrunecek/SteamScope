import { useEffect, useState } from 'react';
import type { ApiErrorCode } from '../../shared/api';

const messages: Record<ApiErrorCode, string> = {
  invalid_steam_id: 'Enter a valid individual SteamID64.',
  not_configured: 'Steam access is not configured on the server yet.',
  rate_limited: 'Too many requests. Please wait a minute before trying again.',
  steam_unavailable: 'Steam is unavailable right now. Please try again.',
  steam_timeout: 'Steam took too long to respond. Please try again.',
  steam_auth_error: 'The server could not authenticate with Steam.',
  invalid_steam_response: 'Steam returned an unexpected response. Please try again later.',
};
type State<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T };

export function useApi<T>(path: string) {
  const [state, setState] = useState<State<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    setState({ status: 'loading' });
    async function load() {
      try {
        const base = import.meta.env.VITE_API_BASE_URL;
        if (!base) throw new Error('Backend is not configured.');
        const response = await fetch(`${base.replace(/\/$/, '')}${path}`, { signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(messages[body.error as ApiErrorCode] ?? 'Unable to load this data. Please try again.');
        if (!body || !['available', 'unavailable'].includes(body.status)) throw new Error('The server returned an unexpected response.');
        if (active) setState({ status: 'ready', data: body as T });
      } catch (error) {
        if (active) setState({ status: 'error', message: controller.signal.aborted
          ? 'The request timed out. Please try again.'
          : error instanceof Error && error.name !== 'TypeError' ? error.message : 'Cannot reach the backend. Please try again.' });
      } finally { clearTimeout(timeout); }
    }
    void load();
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [path, attempt]);
  return { state, retry: () => setAttempt(value => value + 1) };
}
