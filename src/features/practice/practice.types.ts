export interface PracticeSessionInput {
  songId: string | null;
  durationMinutes: number;
  goalDurationMinutes?: number | null;
  completionPercent?: number | null;
  bpm: number | null;
  tags?: string[];
  focusArea: string;
  reflection: string;
}
