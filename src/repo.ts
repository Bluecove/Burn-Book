import {
  db, DEFAULT_STATUSES, type BurnBookDB, type EventType, type ImportedDoc, type Note, type Piece, type PieceEvent, type Status,
} from './db';
import type { ImportRow } from './importParser';

export interface Backup {
  app: 'burn-book';
  version: number;
  exportedAt: string;
  statuses: Status[];
  pieces: Piece[];
  notes: Note[];
  events: PieceEvent[];
  importedDocs: ImportedDoc[];
}

/** All reads and writes go through here. Everything is stored on this device. */
export function makeRepo(d: BurnBookDB) {
  async function statusById(id: number | null): Promise<Status | undefined> {
    return id == null ? undefined : d.statuses.get(id);
  }

  return {
    async seed() {
      if ((await d.statuses.count()) === 0) await d.statuses.bulkAdd(DEFAULT_STATUSES);
      try {
        // Ask the browser not to clear our data when space runs low.
        await navigator.storage?.persist?.();
      } catch {
        /* not supported */
      }
    },

    async addPiece(title: string, group: string, description: string, statusId: number | null): Promise<number> {
      return d.transaction('rw', d.pieces, d.events, d.statuses, async () => {
        const now = Date.now();
        const id = await d.pieces.add({
          title: title.trim(), group: group.trim(), description: description.trim(),
          statusId, createdAt: now, updatedAt: now,
        });
        const s = await statusById(statusId);
        await d.events.add({
          pieceId: id, type: 'created', date: now, fromStatus: null,
          toStatus: s?.name ?? null, toColor: s?.color ?? null, note: '',
        });
        return id;
      });
    },

    /** Saves a piece. A status change is added to its timeline automatically. */
    async updatePiece(piece: Piece): Promise<void> {
      return d.transaction('rw', d.pieces, d.events, d.statuses, async () => {
        const before = await d.pieces.get(piece.id!);
        await d.pieces.put({ ...piece, updatedAt: Date.now() });
        if (before && before.statusId !== piece.statusId) {
          const from = await statusById(before.statusId);
          const to = await statusById(piece.statusId);
          await d.events.add({
            pieceId: piece.id!,
            type: to?.name.toLowerCase() === 'cut' ? 'cut' : 'status',
            date: Date.now(),
            fromStatus: from?.name ?? 'No status',
            toStatus: to?.name ?? 'No status',
            toColor: to?.color ?? null,
            note: '',
          });
        }
      });
    },

    async setStatus(pieceId: number, statusId: number | null): Promise<void> {
      const p = await d.pieces.get(pieceId);
      if (p) await this.updatePiece({ ...p, statusId });
    },

    async deletePiece(pieceId: number) {
      await d.transaction('rw', d.pieces, d.notes, d.events, async () => {
        await d.notes.where('pieceId').equals(pieceId).delete();
        await d.events.where('pieceId').equals(pieceId).delete();
        await d.pieces.delete(pieceId);
      });
    },

    /** Adds many pieces. Names already in the book are skipped. Returns how many were added. */
    async importPieces(rows: ImportRow[], statusId: number | null): Promise<number> {
      const existing = new Set((await d.pieces.toArray()).map((p) => p.title.toLowerCase()));
      let added = 0;
      for (const r of rows) {
        if (!r.title || existing.has(r.title.toLowerCase())) continue;
        await this.addPiece(r.title, r.group, r.description, statusId);
        existing.add(r.title.toLowerCase());
        added++;
      }
      return added;
    },

    async addNote(pieceId: number, body: string, author: string) {
      const now = Date.now();
      await d.notes.add({
        pieceId, body: body.trim(), author: author.trim(), source: 'manual',
        date: now, sourceDocId: null, sentiment: null, createdAt: now,
      });
      await d.pieces.update(pieceId, { updatedAt: now });
    },

    deleteNote: (id: number) => d.notes.delete(id),

    async addEvent(pieceId: number, type: EventType, date: number, note: string) {
      await d.events.add({ pieceId, type, date, fromStatus: null, toStatus: null, toColor: null, note: note.trim() });
    },

    deleteEvent: (id: number) => d.events.delete(id),

    async addStatus(name: string, color: string) {
      const all = await d.statuses.toArray();
      const order = all.reduce((m, s) => Math.max(m, s.order), -1) + 1;
      await d.statuses.add({ name: name.trim(), color, order });
    },

    updateStatus: (s: Status) => d.statuses.put({ ...s, name: s.name.trim() }),

    async deleteStatus(id: number) {
      await d.transaction('rw', d.statuses, d.pieces, async () => {
        await d.pieces.where('statusId').equals(id).modify({ statusId: null });
        await d.statuses.delete(id);
      });
    },

    async moveStatus(id: number, up: boolean) {
      const list = await d.statuses.orderBy('order').toArray();
      const i = list.findIndex((s) => s.id === id);
      const j = up ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      await d.statuses.bulkPut(list.map((s, order) => ({ ...s, order })));
    },

    /** Everything in one file, to keep a backup or move to another device. */
    async exportAll(): Promise<Backup> {
      return {
        app: 'burn-book',
        version: 1,
        exportedAt: new Date().toISOString(),
        statuses: await d.statuses.toArray(),
        pieces: await d.pieces.toArray(),
        notes: await d.notes.toArray(),
        events: await d.events.toArray(),
        importedDocs: await d.importedDocs.toArray(),
      };
    },

    /** Replaces everything on this device with a backup file's contents. */
    async restoreAll(data: Backup) {
      if (data?.app !== 'burn-book') throw new Error('This is not a Burn Book backup file.');
      await d.transaction('rw', [d.statuses, d.pieces, d.notes, d.events, d.importedDocs], async () => {
        await Promise.all([d.statuses.clear(), d.pieces.clear(), d.notes.clear(), d.events.clear(), d.importedDocs.clear()]);
        await d.statuses.bulkAdd(data.statuses);
        await d.pieces.bulkAdd(data.pieces);
        await d.notes.bulkAdd(data.notes);
        await d.events.bulkAdd(data.events);
        await d.importedDocs.bulkAdd(data.importedDocs ?? []);
      });
    },
  };
}

export const repo = makeRepo(db);
export type Repo = ReturnType<typeof makeRepo>;
