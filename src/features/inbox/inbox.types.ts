export type ImportSource = 'musicbrainz' | 'discogs' | 'spotify';

export interface ImportCandidateSummary {
  id: string;
  displayTitle: string;
  displaySubtitle: string;
  sourceName: ImportSource;
}
