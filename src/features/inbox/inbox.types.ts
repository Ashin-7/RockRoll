export type ImportSource = 'musicbrainz' | 'discogs' | 'spotify' | 'anontraveler';
export type ImportEntityType = 'artist' | 'album' | 'song' | 'archive_collection' | 'archive_item' | 'media_asset';
export type ImportReviewPlannedAction = 'create' | 'match_existing' | 'skip' | 'failed';

export interface ImportCandidateMetadata {
  artistName?: string;
  releaseYear?: number | null;
  coverUrl?: string;
  styles?: string[];
  albumType?: string;
  note?: string;
  sourceRank?: number | null;
}

export interface ImportCandidateSummary {
  id: string;
  entityType: ImportEntityType;
  displayTitle: string;
  displaySubtitle: string;
  sourceName: ImportSource;
  metadata?: ImportCandidateMetadata;
}

export interface ImportDraftJobSummary {
  id: string;
  sourceName: ImportSource;
  query: string;
  completedAt: string | null;
  candidateCount: number;
}

export interface ImportReviewItemSummary {
  id: string;
  entityType: ImportEntityType;
  displayTitle: string;
  sourceName: ImportSource;
  sourceId: string;
  plannedAction: ImportReviewPlannedAction;
  targetEntityId: string | null;
  skipReason: string;
  errorMessage: string | null;
  metadata?: ImportCandidateMetadata;
}

export interface MatchImportReviewItemInput {
  reviewItemId: string;
  targetEntityId: string;
}

export type ImportUserRole = 'anonymous' | 'user' | 'admin';

export interface CommitImportReviewPlanResult {
  createdCount: number;
  matchedCount: number;
  skippedCount: number;
}
