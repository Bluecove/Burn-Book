import { useState } from 'react';
import type { Status } from './db';
import { Sheet, StatusSelect } from './ui';

export interface PieceFields {
  title: string;
  group: string;
  description: string;
  statusId: number | null;
}

export function PieceForm({ title, statuses, initial, onClose, onSave }: {
  title: string;
  statuses: Status[];
  initial: PieceFields;
  onClose: () => void;
  onSave: (v: PieceFields) => void;
}) {
  const [v, setV] = useState(initial);
  const save = () => {
    if (!v.title.trim()) return;
    onSave(v);
    onClose();
  };
  return (
    <Sheet
      title={title}
      onClose={onClose}
      actions={
        <>
          <button className="btn text" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={!v.title.trim()} onClick={save}>Save</button>
        </>
      }
    >
      <form className="form" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label>Name<input autoFocus value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></label>
        <label>Group <span className="muted">(optional)</span>
          <input value={v.group} placeholder="e.g. Act 2" onChange={(e) => setV({ ...v, group: e.target.value })} />
        </label>
        <label>Description <span className="muted">(optional)</span>
          <textarea rows={3} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
        </label>
        <label>Status
          <StatusSelect statuses={statuses} value={v.statusId} onChange={(statusId) => setV({ ...v, statusId })} />
        </label>
      </form>
    </Sheet>
  );
}
