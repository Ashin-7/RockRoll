export type SongStatus = 'planned' | 'learning' | 'polishing' | 'archived';

export interface SongSummary {
  id: string;
  title: string;
  artistName: string;
  status: SongStatus;
  difficulty: number | null;
}

export interface CreateSongInput {
  title: string;
  status: SongStatus;
  difficulty: number | null;
}
