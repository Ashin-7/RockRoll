import type { ImportCandidateMetadata } from './inbox.types';

export interface NormalizedAlbumFields {
  coverUrl: string | null;
  styles: string[];
}

export function normalizeAlbumFields(metadata?: ImportCandidateMetadata): NormalizedAlbumFields {
  const coverUrl = metadata?.coverUrl?.trim() ?? '';
  const styles = Array.from(
    new Set((metadata?.styles ?? []).map((styleName) => styleName.trim()).filter(Boolean)),
  );

  return {
    coverUrl: coverUrl || null,
    styles,
  };
}
