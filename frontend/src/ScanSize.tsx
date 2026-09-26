export function ScanSize({ value, onChange, running, label }: { value: string; onChange: (value: string) => void; running: boolean; label: string }) {
  return <label>{label}<select value={value} disabled={running} onChange={event => onChange(event.target.value)}><option value="5">5 games</option><option value="20">20 games</option><option value="all">All remaining games</option></select></label>;
}
export function ScanProgress({ progress }: { progress: { done: number; total: number } }) {
  return progress.total > 0 ? <p role="status"><progress aria-label="Games completed in this run" value={progress.done} max={progress.total} /> {progress.done} of {progress.total} games completed in this run</p> : null;
}
