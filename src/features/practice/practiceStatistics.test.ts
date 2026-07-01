import { describe, expect, it } from 'vitest';
import { localPracticeHistory } from './practice.mock';
import { calculatePracticeStatistics } from './practiceStatistics';

const unsortedSessions = [
  localPracticeHistory[1],
  localPracticeHistory[2],
  localPracticeHistory[0],
];

describe('calculatePracticeStatistics', () => {
  it('summarizes practice history records', () => {
    expect(calculatePracticeStatistics(unsortedSessions)).toEqual({
      totalSessions: 3,
      totalMinutes: 100,
      uniqueSongs: 3,
      averageMinutes: 33,
      latestPracticeDate: '2026-07-01',
    });
  });

  it('returns safe defaults for empty practice history', () => {
    expect(calculatePracticeStatistics([])).toEqual({
      totalSessions: 0,
      totalMinutes: 0,
      uniqueSongs: 0,
      averageMinutes: 0,
      latestPracticeDate: null,
    });
  });
});
