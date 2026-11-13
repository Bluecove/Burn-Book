# Burn Book

An offline organizer for game content. Each piece of content (a set, level or encounter
that playtesters play) sits in a grid with its status, your notes, playtest feedback and a
timeline of what happened to it: status changes, redesigns and cuts.

Burn Book is a web app you install from Chrome. It works without internet, and everything
you add is saved on your device.

## What's in it

- **Grid of pieces** with a colored status on each card. Tap the status to change it.
- **Filter and search** by status, name or group.
- **Editable statuses**: rename, recolor, reorder, add or delete (starts with New,
  In review, Needs redesign, Shippable, Cut).
- **Piece page** with its notes (and who said it), and a **timeline**. Status changes are
  added to the timeline automatically, and you can mark redesigns, cuts, playtests and
  other milestones on any date.
- **Import** many pieces at once by pasting a list or opening a CSV file.
- **Backups**: save everything to a file and restore it, for example on another device.

Coming next: importing feedback from the Google Docs in your Drive folder (only new docs
each time), then feedback trends and a chart of feedback over each piece's timeline.

## Trying changes

Changes are shared as a preview link first, so nothing needs to be built or deployed on
GitHub to try them. The installed app is only updated when you decide to publish.

## For developers

```
npm install
npm run dev           # live dev server
npm test              # unit tests
npm run build         # dist/: index.html + sw.js + manifest, ready to host as static files
npm run preview:page  # preview/burn-book.html: one-file preview page
```

Stack: Vite, React, TypeScript and Dexie (IndexedDB). Data model in `src/db.ts`;
all reads and writes go through `src/repo.ts`.
