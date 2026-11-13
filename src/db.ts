import Dexie, { type Table } from 'dexie';

/** A status a piece can be in, such as "In review" or "Shippable". The list is editable. */
export interface Status {
  id?: number;
  name: string;
  color: string; // hex, e.g. "#43a047"
  order: number;
}

/** One piece of content (a set, level, encounter...) that playtesters play and give feedback on. */
export interface Piece {
  id?: number;
  title: string;
  group: string;
  description: string;
  statusId: number | null;
  createdAt: number;
  updatedAt: number;
}

export type NoteSource = 'manual' | 'feedback';

/**
 * A note on a piece. Notes you write are "manual". Feedback imported from playtest
 * docs (step 2) is "feedback", with the playtester as author, the playtest day as date
 * and the Drive doc it came from as sourceDocId.
 */
export interface Note {
  id?: number;
  pieceId: number;
  body: string;
  source: NoteSource;
  author: string;
  date: number;
  sourceDocId: string | null;
  /** -1 (negative) to 1 (positive). Filled in by step 3 to chart feedback over time. */
  sentiment: number | null;
  createdAt: number;
}

export type EventType = 'created' | 'status' | 'redesigned' | 'cut' | 'playtest' | 'milestone';

/**
 * A dated moment in a piece's history. Status changes are recorded automatically;
 * redesigns, cuts and other milestones can be added by hand, on any date.
 * Step 3 draws the feedback chart on top of these.
 */
export interface PieceEvent {
  id?: number;
  pieceId: number;
  type: EventType;
  date: number;
  /** Status names are copied in so history still reads right after a rename or delete. */
  fromStatus: string | null;
  toStatus: string | null;
  toColor: string | null;
  note: string;
}

/**
 * Remembers which feedback docs were already read, so an import only picks up
 * new (or edited) docs instead of rereading the whole folder.
 */
export interface ImportedDoc {
  docId: string; // Google Drive file id
  name: string;
  modifiedTime: number;
  importedAt: number;
  noteCount: number;
}

export class BurnBookDB extends Dexie {
  statuses!: Table<Status, number>;
  pieces!: Table<Piece, number>;
  notes!: Table<Note, number>;
  events!: Table<PieceEvent, number>;
  importedDocs!: Table<ImportedDoc, string>;

  constructor(name = 'burnbook') {
    super(name);
    this.version(1).stores({
      statuses: '++id, order',
      pieces: '++id, statusId, title, updatedAt',
      notes: '++id, pieceId, date, sourceDocId, source',
      events: '++id, pieceId, date',
      importedDocs: 'docId, importedAt',
    });
  }
}

export const db = new BurnBookDB();

export const DEFAULT_STATUSES: Omit<Status, 'id'>[] = [
  { name: 'New', color: '#78909c', order: 0 },
  { name: 'In review', color: '#1e88e5', order: 1 },
  { name: 'Needs redesign', color: '#f4511e', order: 2 },
  { name: 'Shippable', color: '#43a047', order: 3 },
  { name: 'Cut', color: '#6d4c41', order: 4 },
];

export const PALETTE = [
  '#78909c', '#1e88e5', '#00acc1', '#43a047', '#7cb342', '#fdd835', '#fb8c00',
  '#f4511e', '#e53935', '#d81b60', '#8e24aa', '#5e35b1', '#6d4c41', '#424242',
];
