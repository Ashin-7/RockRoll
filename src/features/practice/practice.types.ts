export interface PracticeSessionInput {
  songId: string | null;
  durationMinutes: number;
  bpm: number | null;
  focusArea: string;
  reflection: string;
}
