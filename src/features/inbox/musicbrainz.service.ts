interface MusicBrainzArtistPayload {
  id: string;
  name: string;
  country?: string;
  disambiguation?: string;
}

export interface ImportCandidateInput {
  entityType: 'artist' | 'album' | 'song';
  displayTitle: string;
  displaySubtitle: string;
  sourceName: 'musicbrainz';
  sourceId: string;
  sourceUrl: string;
}

export function mapMusicBrainzArtistCandidate(payload: MusicBrainzArtistPayload): ImportCandidateInput {
  const subtitleParts = [payload.country, payload.disambiguation].filter(Boolean);

  return {
    entityType: 'artist',
    displayTitle: payload.name,
    displaySubtitle: subtitleParts.join(' - '),
    sourceName: 'musicbrainz',
    sourceId: payload.id,
    sourceUrl: `https://musicbrainz.org/artist/${payload.id}`,
  };
}
