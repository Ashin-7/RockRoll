export type SongStatus = 'planned' | 'learning' | 'polishing' | 'archived';

export interface SongSummary {
  id: string;
  title: string;
  artistName: string;
  status: SongStatus;
  difficulty: number | null;
}
