import { describe, expect, it } from 'vitest';
import { mapMusicBrainzArtistCandidate } from './musicbrainz.service';

describe('mapMusicBrainzArtistCandidate', () => {
  it('maps MusicBrainz artist payload to import candidate shape', () => {
    const candidate = mapMusicBrainzArtistCandidate({
      id: 'abc-123',
      name: 'The Jimi Hendrix Experience',
      country: 'US',
      disambiguation: 'American-English rock band',
    });

    expect(candidate).toEqual({
      entityType: 'artist',
      displayTitle: 'The Jimi Hendrix Experience',
      displaySubtitle: 'US - American-English rock band',
      sourceName: 'musicbrainz',
      sourceId: 'abc-123',
      sourceUrl: 'https://musicbrainz.org/artist/abc-123',
    });
  });
});
