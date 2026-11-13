import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db, type Status } from './db';
import { repo } from './repo';
import { Dot, Icons, navigate, StatusPill, TopBar } from './ui';
import { PieceForm } from './PieceForm';

const NO_STATUS = -1;

export function GridPage() {
  const pieces = useLiveQuery(() => db.pieces.orderBy('updatedAt').reverse().toArray(), []) ?? [];
  const statuses = useLiveQuery(() => db.statuses.orderBy('order').toArray(), []) ?? [];
  const notes = useLiveQuery(() => db.notes.toArray(), []) ?? [];
  const [query, setQuery] = useState(() => sessionStorageGet('q'));
  const [filter, setFilter] = useState<number | null>(() => {
    const v = sessionStorageGet('f');
    return v ? Number(v) : null;
  });
  const [adding, setAdding] = useState(false);

  const setQ = (q: string) => { setQuery(q); sessionStorageSet('q', q); };
  const setF = (f: number | null) => { setFilter(f); sessionStorageSet('f', f == null ? '' : String(f)); };

  const counts = new Map<number, { notes: number; feedback: number }>();
  for (const n of notes) {
    const c = counts.get(n.pieceId) ?? { notes: 0, feedback: 0 };
    c.notes++;
    if (n.source === 'feedback') c.feedback++;
    counts.set(n.pieceId, c);
  }
  const statusMap = new Map(statuses.map((s) => [s.id!, s]));
  const q = query.trim().toLowerCase();
  const visible = pieces.filter((p) => {
    const f = filter == null ? true : filter === NO_STATUS ? p.statusId == null : p.statusId === filter;
    const m = !q || p.title.toLowerCase().includes(q) || p.group.toLowerCase().includes(q);
    return f && m;
  });
  const noStatusCount = pieces.filter((p) => p.statusId == null || !statusMap.has(p.statusId)).length;

  return (
    <>
      <TopBar title="Burn Book">
        <button className="icon-btn" aria-label="Import pieces" title="Import pieces" onClick={() => navigate('import')}>
          <Icons.Upload />
        </button>
        <button className="icon-btn" aria-label="Edit statuses" title="Edit statuses" onClick={() => navigate('statuses')}>
          <Icons.Tag />
        </button>
        <button className="icon-btn" aria-label="Backup and settings" title="Backup and settings" onClick={() => navigate('backup')}>
          <Icons.More />
        </button>
      </TopBar>
      <main>
        <label className="search">
          <Icons.Search />
          <input
            type="search"
            placeholder="Search pieces"
            value={query}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <div className="chips" role="toolbar" aria-label="Filter by status">
          <button className={`chip ${filter == null ? 'on' : ''}`} onClick={() => setF(null)}>
            All <span className="count">{pieces.length}</span>
          </button>
          {statuses.map((s) => (
            <button
              key={s.id}
              className={`chip ${filter === s.id ? 'on' : ''}`}
              onClick={() => setF(filter === s.id ? null : s.id!)}
            >
              <Dot color={s.color} /> {s.name}{' '}
              <span className="count">{pieces.filter((p) => p.statusId === s.id).length}</span>
            </button>
          ))}
          {noStatusCount > 0 && (
            <button
              className={`chip ${filter === NO_STATUS ? 'on' : ''}`}
              onClick={() => setF(filter === NO_STATUS ? null : NO_STATUS)}
            >
              No status <span className="count">{noStatusCount}</span>
            </button>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="empty">
            <h2>{pieces.length ? 'Nothing matches' : 'No pieces yet'}</h2>
            <p className="muted">
              {pieces.length
                ? 'Try another search or status filter.'
                : 'Tap + to add a piece of content, or use the import button at the top to add many at once. Tap the colored status on any card to change it.'}
            </p>
            {!pieces.length && (
              <button className="btn" onClick={() => setAdding(true)}>Add your first piece</button>
            )}
          </div>
        ) : (
          <ul className="grid">
            {visible.map((p) => {
              const s = p.statusId != null ? statusMap.get(p.statusId) : undefined;
              const c = counts.get(p.id!);
              return (
                <li key={p.id} className="card" style={{ borderTopColor: s?.color ?? '#bdbdbd' }}>
                  <button className="card-main" onClick={() => navigate(`piece-${p.id}`)}>
                    <span className="card-title">{p.title}</span>
                    {p.group && <span className="card-group">{p.group}</span>}
                  </button>
                  <div className="card-foot">
                    <QuickStatus status={s} statuses={statuses} onPick={(id) => repo.setStatus(p.id!, id)} />
                    <span className="card-notes">
                      <Icons.Chat /> {notesLabel(c?.notes ?? 0, c?.feedback ?? 0)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <button className="fab" aria-label="Add piece" onClick={() => setAdding(true)}>
        <Icons.Add />
      </button>
      {adding && (
        <PieceForm
          title="New piece"
          statuses={statuses}
          initial={{ title: '', group: '', description: '', statusId: statuses[0]?.id ?? null }}
          onClose={() => setAdding(false)}
          onSave={(v) => repo.addPiece(v.title, v.group, v.description, v.statusId)}
        />
      )}
    </>
  );
}

/** The status pill doubles as a picker: tapping it opens the phone's native list. */
function QuickStatus({ status, statuses, onPick }: {
  status?: Status; statuses: Status[]; onPick: (id: number | null) => void;
}) {
  return (
    <label className="quick-status">
      <StatusPill status={status} />
      <select
        aria-label="Change status"
        value={status?.id ?? ''}
        onChange={(e) => onPick(e.target.value === '' ? null : Number(e.target.value))}
      >
        {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        <option value="">No status</option>
      </select>
    </label>
  );
}

function notesLabel(notes: number, feedback: number) {
  if (!notes) return 'No notes';
  if (!feedback) return notes === 1 ? '1 note' : `${notes} notes`;
  return `${notes} · ${feedback} feedback`;
}

function sessionStorageGet(k: string): string {
  try { return sessionStorage.getItem('bb-' + k) ?? ''; } catch { return ''; }
}
function sessionStorageSet(k: string, v: string) {
  try { sessionStorage.setItem('bb-' + k, v); } catch { /* ignore */ }
}
