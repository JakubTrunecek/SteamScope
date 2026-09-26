import { isSteamId } from '../../shared/api';

export function parseProfileInput(input: string): { steamId: string } | { error: string } {
  const value = input.trim();
  if (isSteamId(value)) return { steamId: value };
  const invalid = { error: 'Enter a valid 17-digit individual SteamID64 or a steamcommunity.com/profiles/ link.' };
  // Only extract an ID locally. Never fetch a pasted URL or forward it to the proxy.
  if (!value || /[\\\s]/.test(value)) return invalid;
  try {
    const url = new URL(/^steamcommunity\.com\//i.test(value) || /^www\.steamcommunity\.com\//i.test(value) ? `https://${value}` : value);
    if (!['http:', 'https:'].includes(url.protocol) || !['steamcommunity.com', 'www.steamcommunity.com'].includes(url.hostname) || url.username || url.password || url.port) return invalid;
    if (/^\/id\/[^/]+\/?$/.test(url.pathname)) return { error: 'Custom /id/ profile links are not supported yet. Use your 17-digit SteamID64 or a numeric /profiles/ link.' };
    const match = /^\/profiles\/(\d{17})\/?$/.exec(url.pathname);
    return match && isSteamId(match[1]) ? { steamId: match[1] } : invalid;
  } catch { return invalid; }
}
