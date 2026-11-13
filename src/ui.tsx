import { useEffect, useState, type ReactNode } from 'react';
import type { PieceEvent, Status } from './db';

/** Pages are plain #names (e.g. #piece-12, #statuses) so links work everywhere. */
export function navigate(page: string) {
  location.hash = page;
}

/** True when running inside a preview frame instead of as the real installed app. */
export const inPreview = (() => {
  try { return window.top !== window.self; } catch { return true; }
})();

export function useRoute(): string[] {
  const read = () => {
    const h = location.hash.replace(/^#/, '');
    const m = /^([a-z]+)(?:-(\d+))?$/.exec(h);
    return m ? [m[1], m[2] ?? ''] : [];
  };
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

/** Readable text color on top of a background color. */
export function textOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#1b1b1f' : '#ffffff';
}

const NO_STATUS_COLOR = '#bdbdbd';

export function StatusPill({ status }: { status?: Status | null }) {
  const bg = status?.color ?? NO_STATUS_COLOR;
  return (
    <span className="pill" style={{ background: bg, color: textOn(bg) }}>
      {status?.name ?? 'No status'}
    </span>
  );
}

export function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return <span className="dot" style={{ background: color, width: size, height: size }} />;
}

export function StatusSelect({
  statuses, value, onChange, id,
}: { statuses: Status[]; value: number | null; onChange: (v: number | null) => void; id?: string }) {
  const current = statuses.find((s) => s.id === value);
  return (
    <div className="status-select" style={{ borderColor: current?.color ?? 'var(--line)' }}>
      <Dot color={current?.color ?? NO_STATUS_COLOR} size={12} />
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      >
        {statuses.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
        <option value="">No status</option>
      </select>
    </div>
  );
}

export function Sheet({ title, onClose, children, actions }: {
  title: string; onClose: () => void; children: ReactNode; actions: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <div className="sheet-body">{children}</div>
        <div className="sheet-actions">{actions}</div>
      </div>
    </div>
  );
}

export function Confirm({ title, body, confirmLabel, onConfirm, onClose }: {
  title: string; body?: string; confirmLabel: string; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Sheet
      title={title}
      onClose={onClose}
      actions={
        <>
          <button className="btn text" onClick={onClose}>Cancel</button>
          <button className="btn danger" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
        </>
      }
    >
      {body && <p className="muted">{body}</p>}
    </Sheet>
  );
}

export const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

/** yyyy-mm-dd in local time, for <input type="date">. */
export const toDateInput = (t: number) => {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
/** Noon local time on that day, so the date never shifts across time zones. */
export const fromDateInput = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12).getTime();
};

export const EVENT_LABELS: Record<PieceEvent['type'], string> = {
  created: 'Added',
  status: 'Status changed',
  redesigned: 'Redesigned',
  cut: 'Cut',
  playtest: 'Playtest',
  milestone: 'Milestone',
};

const icon = (d: string) => () => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d={d} /></svg>
);
export const Icons = {
  Back: icon('M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z'),
  Add: icon('M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'),
  Search: icon('M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'),
  Upload: icon('M5 20h14v-2H5v2zm0-10h4v6h6v-6h4l-7-7-7 7z'),
  Tag: icon('M21.41 11.58l-9-9A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z'),
  Edit: icon('M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'),
  Delete: icon('M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'),
  Up: icon('M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z'),
  Down: icon('M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z'),
  Chat: icon('M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z'),
  More: icon('M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z'),
};

export function TopBar({ title, back, children }: { title: string; back?: boolean; children?: ReactNode }) {
  return (
    <header className="topbar">
      {back && (
        <button className="icon-btn" aria-label="Back" onClick={() => navigate('')}>
          <Icons.Back />
        </button>
      )}
      <h1>{title}</h1>
      <div className="topbar-actions">{children}</div>
    </header>
  );
}
