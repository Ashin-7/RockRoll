export type AnontravelerRankIndexStatus = 'pending' | 'imported' | 'failed' | 'skipped';

export interface AnontravelerRankIndexItem {
  title: string;
  versionId: string;
  sourceUrl: string;
  itemCount: number | null;
  status: AnontravelerRankIndexStatus;
  discoveredAt: string;
  lastImportedAt: string | null;
}

export interface AnontravelerRankDirectoryPage {
  items: AnontravelerRankIndexItem[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

export interface AnontravelerPreviewArtist {
  externalId: string;
  name: string;
}

export interface AnontravelerPreviewAlbum {
  externalId: string;
  title: string;
  artistName: string;
  releaseYear: number | null;
  coverUrl: string;
  styles: string[];
  albumType: string;
  note: string;
}

export interface AnontravelerPreviewArchiveItem {
  externalId: string;
  albumExternalId: string;
  displayTitle: string;
  position: number | null;
  note: string;
}

export interface AnontravelerPreview {
  versionId: string;
  sourceUrl: string;
  collection: {
    externalId: string;
    title: string;
    description: string;
    source: 'anontraveler';
    collectionType: 'album_rank';
  };
  artists: AnontravelerPreviewArtist[];
  albums: AnontravelerPreviewAlbum[];
  archiveItems: AnontravelerPreviewArchiveItem[];
  skippedSongs: number;
}
