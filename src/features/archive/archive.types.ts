export interface ArchiveCountSummary {
  artists: number;
  albums: number;
  genres: number;
}

export type ArchiveEntityType = 'artist' | 'album' | 'song';

export interface ArchiveCollectionSummary {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  description: string;
  collectionType: string;
}

export interface ArchiveItemSummary {
  id: string;
  entityType: ArchiveEntityType;
  entityId: string;
  displayTitle: string;
  position: number | null;
  note: string;
  externalSource: string | null;
  externalId: string | null;
}

export interface ArchiveCollectionDetail extends ArchiveCollectionSummary {
  items: ArchiveItemSummary[];
}

export interface CreateArchiveCollectionInput {
  title: string;
  source: string;
  sourceUrl: string;
  description: string;
  collectionType: string;
}

export interface CreateArchiveItemInput {
  collectionId: string;
  entityType: ArchiveEntityType;
  entityId: string;
  displayTitle: string;
  position: number | null;
  note: string;
  externalSource: string | null;
  externalId: string | null;
}

export interface UpdateArchiveItemInput {
  itemId: string;
  entityType: ArchiveEntityType;
  entityId: string;
  displayTitle: string;
  position: number | null;
  note: string;
  externalSource: string | null;
  externalId: string | null;
}
