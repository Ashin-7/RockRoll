import { describe, expect, it } from 'vitest';
import { groupTabFretEvents } from './tab-events';
import type { TabFretPosition } from './toolbox.types';

function position(
  stringNumber: TabFretPosition['stringNumber'],
  fret: number,
  x: number,
): TabFretPosition {
  return { page: 1, measureNumber: 3, stringNumber, fret, x, y: stringNumber * 10, confidence: 'high' };
}

describe('groupTabFretEvents', () => {
  it('groups same-column fret positions and orders event columns from left to right', () => {
    const lowE3 = position(1, 3, 100);
    const b7 = position(5, 7, 102);
    const g5 = position(4, 5, 150);

    expect(groupTabFretEvents([g5, b7, lowE3])).toEqual({
      events: [
        { page: 1, measureNumber: 3, order: 1, x: 101, positions: [lowE3, b7], confidence: 'high' },
        { page: 1, measureNumber: 3, order: 2, x: 150, positions: [g5], confidence: 'high' },
      ],
      warnings: [],
    });
  });

  it('keeps conflicting same-string frets as a medium-confidence event with a warning', () => {
    const result = groupTabFretEvents([
      position(2, 3, 100),
      position(2, 5, 101),
      position(5, 7, 102),
    ]);

    expect(result.events).toEqual([
      expect.objectContaining({ confidence: 'medium' }),
    ]);
    expect(result.warnings).toEqual(['1 tab fret event has conflicting fret candidates on one string.']);
  });
});
