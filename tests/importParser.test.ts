import { describe, expect, it } from 'vitest';
import { parseImport } from '../src/importParser';

describe('parseImport', () => {
  it('reads names, groups and descriptions, skipping headers, blanks and repeats', () => {
    const rows = parseImport(
      'Title, Group, Description\nLava Bridge\nIce Cave, Act 2\n\n"Boss Arena, Phase 2", Act 3, Two phases, then a chase\nlava bridge',
    );
    expect(rows).toEqual([
      { title: 'Lava Bridge', group: '', description: '' },
      { title: 'Ice Cave', group: 'Act 2', description: '' },
      { title: 'Boss Arena, Phase 2', group: 'Act 3', description: 'Two phases, then a chase' },
    ]);
  });

  it('handles tabs pasted from a spreadsheet', () => {
    expect(parseImport('Set A\tAct 1')).toEqual([{ title: 'Set A', group: 'Act 1', description: '' }]);
  });
});
