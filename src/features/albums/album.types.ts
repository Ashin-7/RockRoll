export type AlbumType = 'album' | 'ep' | 'live' | 'compilation';

export interface AlbumSummary {
  id: string;
  title: string;
  artistName: string;
  releaseYear: number | null;
  albumType: AlbumType;
  notes: string;
}

export interface AlbumCollectionAlbumSummary extends AlbumSummary {
  rank: number | null;
  coverUrl: string;
  styles: string[];
  reviewNote: string;
}

export interface AlbumCollectionSummary {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  description: string;
  albums: AlbumCollectionAlbumSummary[];
}

export type AlbumDetail = AlbumSummary;

export interface CreateAlbumInput {
  title: string;
  artistId: string | null;
  releaseYear: number | null;
  albumType: AlbumType;
  notes: string;
}

export type UpdateAlbumInput = CreateAlbumInput;
