import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db, type EventType, type Note, type PieceEvent } from './db';
import { repo } from './repo';
import { PieceForm } from './PieceForm';
import {
  Confirm, EVENT_LABELS, fmtDate, fromDateInput, Icons, navigate, Sheet, StatusSelect, toDateInput, TopBar,
} from './ui';

const MANUAL_TYPES: EventType[] = ['redesigned', 'cut', 'playtest', 'milestone'];
const EVENT_COLORS: Partial<Record<EventType, string>> = {
  redesigned: '#f4511e', cut: '#6d4c41', playtest: '#00acc1', milestone: '#8e24aa',
};

export function PiecePage({ id }: { id: number }) {
  const piece = useLiveQuery(() => db.pieces.get(id).then((p) => p ?? null), [id]);
  const statuses = useLiveQuery(() => db.statuses.orderBy('order').toArray(), []) ?? [];
  const notes = useLiveQuery(
    () => db.notes.where('pieceId').equals(id).toArray().then((l) => l.sort((a, b) => b.date - a.date || b.id! - a.id!)),
    [id],
  ) ?? [];
  const events = useLiveQuery(
    () => db.events.where('pieceId').equals(id).toArray().then((l) => l.sort((a, b) => b.date - a.date || b.id! - a.id!)),
    [id],
  ) ?? [];

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [allEvents, setAllEvents] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('');

  if (piece === undefined) {
    return <TopBar title="" back />;
  }
  if (piece === null) {
    return (
      <>
        <TopBar title="Not found" back />
        <main className="empty"><p>This piece doesn't exist anymore.</p></main>
      </>
    );
  }

  const shownEvents = allEvents ? events : events.slice(0, 5);

  return (
    <>
      <TopBar title={piece.title} back>
        <button className="icon-btn" aria-label="Edit piece" onClick={() => setEditing(true)}><Icons.Edit /></button>
        <button className="icon-btn" aria-label="Delete piece" onClick={() => setDeleting(true)}><Icons.Delete /></button>
      </TopBar>
      <main className="detail">
        <section>
          {piece.group && <p className="muted">{piece.group}</p>}
          <label className="inline-label">Status
            <StatusSelect statuses={statuses} value={piece.statusId} onChange={(sid) => repo.setStatus(piece.id!, sid)} />
          </label>
          {piece.description && <p className="description">{piece.description}</p>}
        </section>

        <section>
          <div className="section-head">
            <h2>Timeline</h2>
            <button className="btn text" onClick={() => setAddingEvent(true)}>Mark redesign, cut…</button>
          </div>
          <ol className="timeline">
            {shownEvents.map((e) => (
              <TimelineItem key={e.id} event={e} />
            ))}
          </ol>
          {events.length > 5 && (
            <button className="btn text" onClick={() => setAllEvents(!allEvents)}>
              {allEvents ? 'Show less' : `Show all ${events.length}`}
            </button>
          )}
        </section>

        <section>
          <h2>Add a note</h2>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!noteText.trim()) return;
              repo.addNote(piece.id!, noteText, noteAuthor);
              setNoteText('');
            }}
          >
            <textarea
              rows={3}
              placeholder="What did you notice or hear?"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <div className="row">
              <input
                placeholder="Who said it (optional)"
                value={noteAuthor}
                onChange={(e) => setNoteAuthor(e.target.value)}
              />
              <button className="btn" type="submit" disabled={!noteText.trim()}>Save</button>
            </div>
          </form>
        </section>

        <section>
          <h2>{notes.length ? `Notes (${notes.length})` : 'No notes yet'}</h2>
          <ul className="notes">
            {notes.map((n) => <NoteItem key={n.id} note={n} />)}
          </ul>
        </section>
      </main>

      {editing && (
        <PieceForm
          title="Edit piece"
          statuses={statuses}
          initial={{ title: piece.title, group: piece.group, description: piece.description, statusId: piece.statusId }}
          onClose={() => setEditing(false)}
          onSave={(v) => repo.updatePiece({
            ...piece, title: v.title.trim(), group: v.group.trim(), description: v.description.trim(), statusId: v.statusId,
          })}
        />
      )}
      {deleting && (
        <Confirm
          title={`Delete "${piece.title}"?`}
          body={`This also deletes its ${notes.length} notes and its timeline. It can't be undone.`}
          confirmLabel="Delete"
          onClose={() => setDeleting(false)}
          onConfirm={async () => { await repo.deletePiece(piece.id!); navigate(''); }}
        />
      )}
      {addingEvent && (
        <AddEventSheet
          onClose={() => setAddingEvent(false)}
          onSave={(type, date, note) => repo.addEvent(piece.id!, type, date, note)}
        />
      )}
    </>
  );
}

function eventTitle(e: PieceEvent) {
  switch (e.type) {
    case 'created': return e.toStatus ? `Added as ${e.toStatus}` : 'Added';
    case 'status': return `${e.fromStatus} → ${e.toStatus}`;
    case 'cut': return e.toStatus ? `Cut (from ${e.fromStatus})` : 'Cut';
    default: return EVENT_LABELS[e.type];
  }
}

function TimelineItem({ event }: { event: PieceEvent }) {
  const [confirm, setConfirm] = useState(false);
  const color = EVENT_COLORS[event.type] ?? event.toColor ?? '#9e9e9e';
  return (
    <li>
      <span className="tl-dot" style={{ background: color }} />
      <div className="tl-body">
        <strong>{eventTitle(event)}</strong>
        <span className="muted small">{fmtDate(event.date)}</span>
        {event.note && <p>{event.note}</p>}
      </div>
      {event.type !== 'created' && (
        <button className="icon-btn small" aria-label="Remove from timeline" onClick={() => setConfirm(true)}>
          <Icons.Delete />
        </button>
      )}
      {confirm && (
        <Confirm
          title="Remove from timeline?"
          body="This only removes the timeline entry. The piece's current status stays the same."
          confirmLabel="Remove"
          onClose={() => setConfirm(false)}
          onConfirm={() => repo.deleteEvent(event.id!)}
        />
      )}
    </li>
  );
}

function NoteItem({ note }: { note: Note }) {
  const [confirm, setConfirm] = useState(false);
  const feedback = note.source === 'feedback';
  return (
    <li className={`note ${feedback ? 'feedback' : ''}`}>
      <div className="note-head">
        <span className="tag">{feedback ? 'Feedback' : 'My note'}</span>
        <span className="note-meta">
          {note.author && <strong>{note.author}</strong>}
          <span className="muted small">{fmtDate(note.date)}</span>
        </span>
        <button className="icon-btn small" aria-label="Delete note" onClick={() => setConfirm(true)}>
          <Icons.Delete />
        </button>
      </div>
      <p>{note.body}</p>
      {confirm && (
        <Confirm
          title="Delete this note?"
          confirmLabel="Delete"
          onClose={() => setConfirm(false)}
          onConfirm={() => repo.deleteNote(note.id!)}
        />
      )}
    </li>
  );
}

function AddEventSheet({ onClose, onSave }: {
  onClose: () => void; onSave: (type: EventType, date: number, note: string) => void;
}) {
  const [type, setType] = useState<EventType>('redesigned');
  const [date, setDate] = useState(toDateInput(Date.now()));
  const [note, setNote] = useState('');
  return (
    <Sheet
      title="Add to timeline"
      onClose={onClose}
      actions={
        <>
          <button className="btn text" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={!date} onClick={() => {
            // Today keeps the current time so it sorts after earlier changes from today.
            onSave(type, date === toDateInput(Date.now()) ? Date.now() : fromDateInput(date), note);
            onClose();
          }}>
            Save
          </button>
        </>
      }
    >
      <div className="form">
        <div className="chips wrap" role="radiogroup" aria-label="What happened">
          {MANUAL_TYPES.map((t) => (
            <button key={t} role="radio" aria-checked={type === t} className={`chip ${type === t ? 'on' : ''}`} onClick={() => setType(t)}>
              {EVENT_LABELS[t]}
            </button>
          ))}
        </div>
        <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label>What changed? <span className="muted">(optional)</span>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <p className="muted small">
          Marking a piece as cut here only adds it to the timeline. To move it to the Cut status too, change its status above.
        </p>
      </div>
    </Sheet>
  );
}
