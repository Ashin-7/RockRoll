export type ImportSource = 'musicbrainz' | 'discogs' | 'spotify';
export type ImportEntityType = 'artist' | 'album' | 'song';

export interface ImportCandidateSummary {
  id: string;
  entityType: ImportEntityType;
  displayTitle: string;
  displaySubtitle: string;
  sourceName: ImportSource;
}
