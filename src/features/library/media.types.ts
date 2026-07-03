export type MediaType = 'video' | 'audio' | 'pdf' | 'gp' | 'image' | 'backing_track' | 'link';

export type MediaLinkEntityType = 'song' | 'practice_session' | 'artist' | 'album';

export interface MediaLinkSummary {
  id: string;
  entityType: MediaLinkEntityType;
  entityId: string;
}

export interface MediaAssetSummary {
  id: string;
  fileName: string;
  mediaType: MediaType;
  storageBucket: string;
  storagePath: string;
  notes: string;
  createdAt: string;
  links: MediaLinkSummary[];
}

export interface CreateMediaAssetInput {
  fileName: string;
  mediaType: MediaType;
  storageBucket: string;
  storagePath: string;
  notes: string;
  link: {
    entityType: MediaLinkEntityType;
    entityId: string;
  } | null;
}

export type UpdateMediaAssetInput = CreateMediaAssetInput;
