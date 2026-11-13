import { useEffect, useState } from 'react';
import { repo } from './repo';
import { Confirm, inPreview, TopBar } from './ui';

export function MorePage() {
  const [message, setMessage] = useState('');
  const [persisted, setPersisted] = useState<boolean | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pending, setPending] = useState<any>(null);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
  }, []);

  const backup = async () => {
    const data = await repo.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `burn-book-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMessage(`Saved a backup with ${data.pieces.length} pieces and ${data.notes.length} notes.`);
  };

  const restore = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data?.app !== 'burn-book') throw new Error('This is not a Burn Book backup file.');
      setPending(data);
    } catch (e) {
      setMessage(e instanceof Error && e.message.includes('Burn Book') ? e.message : 'That file could not be read.');
    }
  };

  const doRestore = async () => {
    const data = pending;
    try {
      await repo.restoreAll(data);
      setMessage(`Restored ${data.pieces.length} pieces and ${data.notes.length} notes.`);
    } catch {
      setMessage('Restoring failed. Nothing was changed.');
    }
  };

  return (
    <>
      <TopBar title="Backup & settings" back />
      <main className="form">
        {inPreview && (
          <p className="result">
            This is a preview. Anything you add here stays in this preview only, and saving backups or
            installing works in the real app.
          </p>
        )}
        <section>
          <h2>Your data</h2>
          <p className="muted">
            Everything is saved on this device only, and works without internet.
            {persisted === true && ' Your browser has agreed to keep it safe from automatic cleanup.'}
          </p>
          <p className="muted">
            Save a backup now and then, or to move your book to another device. Google Drive syncing comes in a later step.
          </p>
          <div className="row">
            <button className="btn" onClick={backup}>Save a backup</button>
            <label className="btn outline file-btn">
              Restore a backup…
              <input type="file" accept=".json,application/json" onChange={(e) => { restore(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
          </div>
          {message && <p className="result" role="status">{message}</p>}
        </section>
        <section>
          <h2>Install on your phone</h2>
          <p className="muted">
            In Chrome, open the ⋮ menu and tap <strong>Add to Home screen</strong> (or <strong>Install app</strong>).
            Burn Book then opens like any other app and works offline.
          </p>
        </section>
      </main>
      {pending && (
        <Confirm
          title="Replace everything with this backup?"
          body={`The backup has ${pending.pieces.length} pieces and ${pending.notes.length} notes. Everything currently in Burn Book on this device will be replaced.`}
          confirmLabel="Replace"
          onClose={() => setPending(null)}
          onConfirm={doRestore}
        />
      )}
    </>
  );
}
