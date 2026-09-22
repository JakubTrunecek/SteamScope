import { useEffect, useState, type FormEvent } from 'react';
import { isAppId, isSteamId } from '../../shared/api';
import { GameCapabilities } from './GameCapabilities';
import { Overview, Library, GameSummary } from './SteamScreens';

function Health() {
  const [status, setStatus] = useState('Checking connection…');
  useEffect(() => {
    let active = true;
    const base = import.meta.env.VITE_API_BASE_URL;
    if (!base) {
      setStatus('Backend is not configured.');
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    fetch(`${base.replace(/\/$/, '')}/api/health`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unavailable');
        const body = await response.json();
        if (body.status !== 'ok' || body.service !== 'steamscope-worker') throw new Error('Invalid response');
        if (active) setStatus('Backend connected');
      })
      .catch(() => { if (active) setStatus('Backend unavailable. Please try again later.'); })
      .finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, []);
  return <p className="status" role="status">{status}</p>;
}

function Home() {
  const [steamId, setSteamId] = useState('');
  const [error, setError] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!isSteamId(steamId.trim())) {
      setError('Enter a valid 17-digit individual SteamID64.');
      return;
    }
    location.hash = `/profile/${steamId.trim()}`;
  }
  return <>
    <p className="eyebrow">YOUR GAMES, IN PERSPECTIVE</p>
    <h1>Explore your Steam universe.</h1>
    <p className="lead">Your profile, library and game statistics in one place.</p>
    <form onSubmit={submit} className="card">
      <label htmlFor="steam-id">SteamID64</label>
      <div className="input-row"><input id="steam-id" inputMode="numeric" value={steamId}
        onChange={(event) => setSteamId(event.target.value)} placeholder="17-digit Steam ID"
        aria-invalid={Boolean(error)} aria-describedby={error ? 'id-error' : undefined} />
        <button type="submit">Explore profile →</button></div>
      {error && <p id="id-error" role="alert">{error}</p>}
      <p className="muted">Explore the profile and game details Steam makes visible. No sign-in required.</p>
    </form>
    <div className="grid">
      <section className="card"><h2>Your library</h2><p>Browse owned games and playtime.</p></section>
      <section className="card"><h2>Game achievements</h2><p>Explore achievements in games that support them.</p></section>
      <section className="card"><h2>Detailed Stats</h2><p>Discover the statistics each game makes available.</p></section>
    </div>
  </>;
}

function ProfileNav({ id }: { id: string }) {
  return <nav aria-label="Profile"><a href={`#/profile/${id}`} aria-current={location.hash === `#/profile/${id}` ? 'page' : undefined}>Overview</a><a href={`#/profile/${id}/library`} aria-current={location.hash === `#/profile/${id}/library` ? 'page' : undefined}>Library</a></nav>;
}

function Screen({ path }: { path: string }) {
  if (path === '/' || path === '') return <Home />;
  const match = /^\/profile\/(\d{17})(?:\/(library)|\/game\/([1-9]\d*))?$/.exec(path);
  if (!match || !isSteamId(match[1]) || (match[3] && !isAppId(match[3]))) return <><h1>Page not found</h1><a href="#/">Return home</a></>;
  const [, id, library, appId] = match;
  return <>
    <ProfileNav id={id} />
    <p className="eyebrow">STEAM ID {id}</p>
    <h1>{appId ? 'Game Detail' : library ? 'Library' : 'Profile Overview'}</h1>
    {appId ? <GameSummary id={id} appId={Number(appId)} /> : library ? <Library id={id} /> : <Overview id={id} />}
    {appId && <GameCapabilities id={id} appId={appId} />}
  </>;
}

export function App() {
  const [path, setPath] = useState(location.hash.slice(1) || '/');
  useEffect(() => {
    const title = document.querySelector('main h1')?.textContent;
    document.title = title ? `${title} · SteamScope` : 'SteamScope';
    document.getElementById('main')?.focus();
  }, [path]);
  useEffect(() => {
    const update = () => setPath(location.hash.slice(1) || '/');
    addEventListener('hashchange', update);
    return () => removeEventListener('hashchange', update);
  }, []);
  return <>
    <a className="skip" href="#main" onClick={(event) => { event.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
    <header><a className="brand" href="#/">Steam<span>Scope</span></a><span className="badge">0.0.5 · Preview</span></header>
    <main id="main" tabIndex={-1}><Screen key={path} path={path} /></main>
    <footer><span>SteamScope · Independent Steam explorer</span><Health /></footer>
  </>;
}
