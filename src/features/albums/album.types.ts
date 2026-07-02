export type AlbumType = 'album' | 'ep' | 'live' | 'compilation';

export interface AlbumSummary {
  id: string;
  title: string;
  artistName: string;
  releaseYear: number | null;
  albumType: AlbumType;
  notes: string;
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
