import { expect, it } from 'vitest';
import { parseProfileInput } from '../src/profileInput';
const id = '76561198004260198';
it('extracts exact IDs from numeric Steam links without fetching or carrying query strings into routes', () => {
  for (const value of [id, ` ${id} `, `https://steamcommunity.com/profiles/${id}`, `http://www.steamcommunity.com/profiles/${id}/?l=czech#about`, `steamcommunity.com/profiles/${id}/`, `HTTPS://STEAMCOMMUNITY.COM/profiles/${id}`]) expect(parseProfileInput(value)).toEqual({ steamId: id });
});
it('rejects foreign hosts, credentials, ports, non-profile paths and invalid individual IDs', () => {
  for (const value of ['', '76561197960265728', '76561202255233024', `https://steamcommunity.com.evil.test/profiles/${id}`, `https://evil.test/steamcommunity.com/profiles/${id}`, `https://user@steamcommunity.com/profiles/${id}`, `https://steamcommunity.com:444/profiles/${id}`, `ftp://steamcommunity.com/profiles/${id}`, `https://steamcommunity.com/profiles/${id}/games`, `https://steamcommunity.com/profiles/${id}\\other`, 'javascript:alert(1)', `https://steamcommunity.com/profiles/ ${id}`]) expect(parseProfileInput(value)).toHaveProperty('error');
});
it('explains the unsupported custom URL instead of guessing an ID', () => {
  expect(parseProfileInput('https://steamcommunity.com/id/example/')).toEqual({ error: expect.stringContaining('Custom /id/') });
  expect(parseProfileInput(`https://steamcommunity.com/id/${id}`)).toHaveProperty('error');
});
