export type SongStatus = 'planned' | 'learning' | 'polishing' | 'archived';

export interface SongSummary {
  id: string;
  title: string;
  artistName: string;
  status: SongStatus;
  difficulty: number | null;
}

export interface SongDetail extends SongSummary {
  releaseYear: number | null;
  bpm: number | null;
  notes: string;
}

export interface CreateSongInput {
  title: string;
  status: SongStatus;
  difficulty: number | null;
}
