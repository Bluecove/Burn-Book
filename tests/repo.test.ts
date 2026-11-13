import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { BurnBookDB } from '../src/db';
import { makeRepo } from '../src/repo';

let d: BurnBookDB;
let repo: ReturnType<typeof makeRepo>;

beforeEach(async () => {
  d = new BurnBookDB('test-' + Math.random());
  repo = makeRepo(d);
  await repo.seed();
});

const statusId = async (name: string) => (await d.statuses.toArray()).find((s) => s.name === name)!.id!;

describe('repo', () => {
  it('seeds the default statuses once', async () => {
    await repo.seed();
    expect((await d.statuses.orderBy('order').toArray()).map((s) => s.name)).toEqual([
      'New', 'In review', 'Needs redesign', 'Shippable', 'Cut',
    ]);
  });

  it('records status changes on the timeline, and moving to Cut as a cut', async () => {
    const id = await repo.addPiece('Lava Bridge', 'Act 1', '', await statusId('New'));
    await repo.setStatus(id, await statusId('In review'));
    await repo.setStatus(id, await statusId('In review')); // no change, no event
    await repo.setStatus(id, await statusId('Cut'));
    const events = await d.events.where('pieceId').equals(id).sortBy('id');
    expect(events.map((e) => [e.type, e.fromStatus, e.toStatus])).toEqual([
      ['created', null, 'New'],
      ['status', 'New', 'In review'],
      ['cut', 'In review', 'Cut'],
    ]);
  });

  it('adds hand-made timeline entries with a chosen date', async () => {
    const id = await repo.addPiece('Ice Cave', '', '', null);
    const date = new Date(2026, 9, 1, 12).getTime();
    await repo.addEvent(id, 'redesigned', date, 'New layout');
    const e = (await d.events.where('pieceId').equals(id).toArray()).find((x) => x.type === 'redesigned')!;
    expect(e.date).toBe(date);
    expect(e.note).toBe('New layout');
  });

  it('imports pieces and skips names already in the book', async () => {
    await repo.addPiece('Lava Bridge', '', '', null);
    const added = await repo.importPieces(
      [
        { title: 'lava bridge', group: '', description: '' },
        { title: 'Ice Cave', group: 'Act 2', description: '' },
      ],
      null,
    );
    expect(added).toBe(1);
    expect(await d.pieces.count()).toBe(2);
  });

  it('deleting a status leaves its pieces with no status', async () => {
    const sid = await statusId('In review');
    const id = await repo.addPiece('Boss', '', '', sid);
    await repo.deleteStatus(sid);
    expect((await d.pieces.get(id))!.statusId).toBeNull();
  });

  it('deleting a piece removes its notes and timeline', async () => {
    const id = await repo.addPiece('Boss', '', '', null);
    await repo.addNote(id, 'Too hard', 'Sam');
    await repo.deletePiece(id);
    expect(await d.notes.count()).toBe(0);
    expect(await d.events.count()).toBe(0);
  });

  it('round-trips a backup', async () => {
    const id = await repo.addPiece('Boss', 'Act 3', 'Final fight', await statusId('Shippable'));
    await repo.addNote(id, 'Loved it', 'Ana');
    const backup = await repo.exportAll();
    await repo.deletePiece(id);
    await repo.restoreAll(JSON.parse(JSON.stringify(backup)));
    expect((await d.pieces.toArray()).map((p) => p.title)).toEqual(['Boss']);
    expect((await d.notes.toArray())[0].author).toBe('Ana');
  });
});
