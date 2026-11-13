import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db, PALETTE, type Status } from './db';
import { repo } from './repo';
import { Confirm, Dot, Icons, Sheet, TopBar } from './ui';

export function StatusesPage() {
  const statuses = useLiveQuery(() => db.statuses.orderBy('order').toArray(), []) ?? [];
  const pieces = useLiveQuery(() => db.pieces.toArray(), []) ?? [];
  const [editing, setEditing] = useState<Status | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Status | null>(null);

  return (
    <>
      <TopBar title="Statuses" back />
      <main>
        <p className="muted">Tap a status to rename it or change its color. The arrows set the order on the main screen.</p>
        <ul className="list">
          {statuses.map((s, i) => (
            <li key={s.id}>
              <button className="list-main" onClick={() => setEditing(s)}>
                <Dot color={s.color} size={16} />
                <span>{s.name}</span>
                <span className="muted small">{pieces.filter((p) => p.statusId === s.id).length}</span>
              </button>
              <button className="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => repo.moveStatus(s.id!, true)}><Icons.Up /></button>
              <button className="icon-btn" aria-label="Move down" disabled={i === statuses.length - 1} onClick={() => repo.moveStatus(s.id!, false)}><Icons.Down /></button>
              <button className="icon-btn" aria-label="Delete status" onClick={() => setDeleting(s)}><Icons.Delete /></button>
            </li>
          ))}
        </ul>
        <button className="btn" onClick={() => setEditing('new')}>Add a status</button>
      </main>

      {editing && (
        <StatusSheet
          initial={editing === 'new' ? { name: '', color: PALETTE[statuses.length % PALETTE.length], order: 0 } : editing}
          title={editing === 'new' ? 'New status' : 'Edit status'}
          onClose={() => setEditing(null)}
          onSave={(name, color) =>
            editing === 'new' ? repo.addStatus(name, color) : repo.updateStatus({ ...editing, name, color })
          }
        />
      )}
      {deleting && (
        <Confirm
          title={`Delete "${deleting.name}"?`}
          body="Pieces with this status will show “No status” until you pick a new one. Their timelines are kept."
          confirmLabel="Delete"
          onClose={() => setDeleting(null)}
          onConfirm={() => repo.deleteStatus(deleting.id!)}
        />
      )}
    </>
  );
}

function StatusSheet({ initial, title, onClose, onSave }: {
  initial: Status; title: string; onClose: () => void; onSave: (name: string, color: string) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  const save = () => { if (name.trim()) { onSave(name, color); onClose(); } };
  return (
    <Sheet
      title={title}
      onClose={onClose}
      actions={
        <>
          <button className="btn text" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={!name.trim()} onClick={save}>Save</button>
        </>
      }
    >
      <form className="form" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label>Name<input autoFocus value={name} onChange={(e) => setName(e.target.value)} /></label>
        <div className="swatches" role="radiogroup" aria-label="Color">
          {PALETTE.map((c) => (
            <button
              type="button"
              key={c}
              role="radio"
              aria-checked={c === color}
              aria-label={c}
              className={`swatch ${c === color ? 'on' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </form>
    </Sheet>
  );
}
