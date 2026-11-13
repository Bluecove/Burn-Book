import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from './db';
import { parseImport } from './importParser';
import { repo } from './repo';
import { StatusSelect, TopBar } from './ui';

export function ImportPage() {
  const statuses = useLiveQuery(() => db.statuses.orderBy('order').toArray(), []) ?? [];
  const [text, setText] = useState('');
  const [statusId, setStatusId] = useState<number | null | undefined>(undefined);
  const [result, setResult] = useState('');
  const rows = parseImport(text);
  const chosen = statusId === undefined ? statuses[0]?.id ?? null : statusId;

  const openFile = async (file: File | undefined) => {
    if (!file) return;
    const content = await file.text();
    setText((t) => (t.trim() ? t.trimEnd() + '\n' + content : content));
    setResult('');
  };

  const add = async () => {
    const added = await repo.importPieces(rows, chosen);
    const skipped = rows.length - added;
    setResult(`Added ${added} piece${added === 1 ? '' : 's'}.${skipped ? ` Skipped ${skipped} already in your book.` : ''}`);
    setText('');
  };

  return (
    <>
      <TopBar title="Import pieces" back />
      <main className="form">
        <p className="muted">
          Paste a list with one piece per line, or open a CSV or text file. You can paste straight from a
          spreadsheet too. Add a group and a description after commas:
        </p>
        <pre className="example">Lava Bridge{'\n'}Ice Cave, Act 2{'\n'}Boss Arena, Act 3, Final fight with two phases</pre>
        <label className="btn outline file-btn">
          Open a file…
          <input type="file" accept=".csv,.txt,.tsv,text/*" onChange={(e) => { openFile(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        <label>Pieces
          <textarea rows={8} value={text} onChange={(e) => { setText(e.target.value); setResult(''); }} />
        </label>
        <label>Start them as
          <StatusSelect statuses={statuses} value={chosen} onChange={setStatusId} />
        </label>
        <button className="btn" disabled={!rows.length} onClick={add}>
          {rows.length ? `Add ${rows.length} piece${rows.length === 1 ? '' : 's'}` : 'Add pieces'}
        </button>
        {result && <p className="result" role="status">{result}</p>}
      </main>
    </>
  );
}
