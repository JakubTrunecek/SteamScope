import { isSteamId, isVanityName } from '../../shared/api';

export function parseProfileInput(input: string): { steamId: string } | { vanity: string } | { error: string } {
  const value = input.trim();
  if (isSteamId(value)) return { steamId: value };
  const invalid = { error: 'Enter a valid 17-digit individual SteamID64 or a Steam Community profile link.' };
  // Only extract an ID locally. Never fetch a pasted URL or forward it to the proxy.
  if (!value || /[\\\s]/.test(value)) return invalid;
  try {
    const url = new URL(/^steamcommunity\.com\//i.test(value) || /^www\.steamcommunity\.com\//i.test(value) ? `https://${value}` : value);
    if (!['http:', 'https:'].includes(url.protocol) || !['steamcommunity.com', 'www.steamcommunity.com'].includes(url.hostname) || url.username || url.password || url.port) return invalid;
    const custom = /^\/id\/([^/]+)\/?$/.exec(url.pathname);
    if (custom) return isVanityName(custom[1]) ? { vanity: custom[1] } : { error: 'This custom profile address is not valid. Use letters, digits, underscores or hyphens (up to 64 characters).' };
    const match = /^\/profiles\/(\d{17})\/?$/.exec(url.pathname);
    return match && isSteamId(match[1]) ? { steamId: match[1] } : invalid;
  } catch { return invalid; }
}
