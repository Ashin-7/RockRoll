export type MediaType = 'video' | 'audio' | 'pdf' | 'gp' | 'image' | 'backing_track' | 'link';

export interface MediaAssetSummary {
  id: string;
  fileName: string;
  mediaType: MediaType;
  createdAt: string;
}
