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

export interface AlbumCollectionOption {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  description: string;
}

export interface AlbumCollectionSummary extends AlbumCollectionOption {
  albums: AlbumCollectionAlbumSummary[];
  totalAlbumCount?: number;
  availableStyles?: string[];
}

export interface AlbumCollectionPageInput {
  pageIndex: number;
  pageSize: number;
  style?: string;
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
