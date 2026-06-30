import { ArchiveCountSummary } from './archive.types';

export async function getArchiveSummary(): Promise<ArchiveCountSummary> {
  return {
    artists: 0,
    albums: 0,
    genres: 0,
  };
}
