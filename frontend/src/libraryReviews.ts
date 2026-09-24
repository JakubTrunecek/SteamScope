import { useEffect, useRef, useState } from 'react';
import type { Game, ReviewsResult } from '../../shared/api';

// Public app metadata only, bounded to 500 games in this tab; reload clears it.
const memory = new Map<number, ReviewsResult>();
export function clearReviewMemory() { memory.clear(); }
export function reviewPercent(result: ReviewsResult | undefined): number | null {
  return result?.status === 'available' && result.data.total > 0 ? 100 * result.data.positive / result.data.total : null;
}
export function compareReviews(a: Game, b: Game, reviews: Map<number, ReviewsResult>) {
  const first = reviewPercent(reviews.get(a.appId)), second = reviewPercent(reviews.get(b.appId));
  if (first === null || second === null) return first === second ? a.name.localeCompare(b.name) : first === null ? 1 : -1;
  const count = (game: Game) => { const result = reviews.get(game.appId); return result?.status === 'available' ? result.data.total : 0; };
  return second - first || count(b) - count(a) || a.name.localeCompare(b.name);
}
export function matchesReviews(result: ReviewsResult | undefined, threshold: string, minimum: number) {
  if (threshold === 'all' && minimum === 0) return true;
  const percent = reviewPercent(result);
  return percent !== null && result?.status === 'available' && result.data.total >= minimum && (threshold === 'all' || percent >= Number(threshold));
}
export function useLibraryReviews(profile: string) {
  const [reviews, setReviews] = useState(() => new Map(memory));
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => { setMessage(''); setRunning(false); return () => { active.current?.abort(); active.current = null; }; }, [profile]);
  async function load(games: Game[]) {
    if (active.current) return;
    const controller = new AbortController(); active.current = controller; setRunning(true);
    const queue = games.filter(game => !reviews.has(game.appId)).slice(0, 5);
    try {
      for (const game of queue) {
        setMessage(`Loading reviews for ${game.name}…`);
        await new Promise<void>((resolve, reject) => {
          const abort = () => { clearTimeout(timer); reject(new Error('Stopped')); };
          const timer = setTimeout(() => { controller.signal.removeEventListener('abort', abort); resolve(); }, 2500);
          controller.signal.addEventListener('abort', abort, { once: true });
          if (controller.signal.aborted) abort();
        });
        const base = import.meta.env.VITE_API_BASE_URL;
        if (!base) throw new Error('Backend is not configured.');
        const response = await fetch(`${base.replace(/\/$/, '')}/api/games/${game.appId}/reviews`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]) });
        if (!response.ok) throw new Error(response.status === 429 ? 'Too many requests. Wait a minute, then continue.' : 'Unable to load reviews. Continue to retry the unfinished game.');
        const result = await response.json() as ReviewsResult;
        if (!result || !['available', 'unavailable'].includes(result.status)) throw new Error('Unexpected review response. Please try again.');
        if (controller.signal.aborted) break;
        memory.delete(game.appId); memory.set(game.appId, result);
        while (memory.size > 500) memory.delete(memory.keys().next().value!);
        setReviews(new Map(memory));
      }
      if (!controller.signal.aborted) setMessage('Batch finished. Load another batch to expand coverage.');
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof Error && error.name !== 'TypeError' ? error.message : 'Cannot reach SteamScope. Continue to retry.');
    } finally {
      if (active.current === controller) { active.current = null; setRunning(false); }
    }
  }
  return { reviews, running, message, load, stop: () => { active.current?.abort(); setMessage('Stopped. Loaded reviews are kept.'); } };
}
