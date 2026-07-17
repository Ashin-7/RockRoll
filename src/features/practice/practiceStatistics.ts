import { PracticeHistoryItem } from './practice.mock';

export interface PracticeStatistics {
  totalSessions: number;
  totalMinutes: number;
  uniqueSongs: number;
  averageMinutes: number;
  latestPracticeDate: string | null;
}

export function calculatePracticeStatistics(sessions: PracticeHistoryItem[]): PracticeStatistics {
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalMinutes: 0,
      uniqueSongs: 0,
      averageMinutes: 0,
      latestPracticeDate: null,
    };
  }

  const totalMinutes = sessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const latestPracticeDate = sessions.reduce((latest, session) => {
    return session.practicedOn > latest ? session.practicedOn : latest;
  }, sessions[0].practicedOn);

  return {
    totalSessions: sessions.length,
    totalMinutes,
    uniqueSongs: new Set(sessions.map((session) => session.songTitle)).size,
    averageMinutes: Math.round(totalMinutes / sessions.length),
    latestPracticeDate,
  };
}
