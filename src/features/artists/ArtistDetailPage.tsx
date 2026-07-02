import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { ArtistDetail } from './artist.types';
import { getArtistById } from './artists.service';
import './ArtistDetailPage.css';

interface ArtistDetailPageProps {
  artistId: string | null;
  onLoadArtist?: (artistId: string) => Promise<ArtistDetail | null>;
}

export function ArtistDetailPage({ artistId, onLoadArtist = getArtistById }: ArtistDetailPageProps) {
  const { t } = useI18n();
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(artistId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!artistId) {
      setArtist(null);
      setIsLoading(false);
      setError('');
      return;
    }

    const currentArtistId = artistId;
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError('');

      try {
        const nextArtist = await onLoadArtist(currentArtistId);
        if (isMounted) {
          setArtist(nextArtist);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : t('artistDetail.loadError'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [artistId, onLoadArtist, t]);

  return (
    <section className="artist-detail-page">
      <a className="artist-detail-page__back" href="#artists">
        {t('artistDetail.backToArtists')}
      </a>

      {isLoading ? <p className="artist-detail-page__loading">{t('artistDetail.loading')}</p> : null}
      {error ? <p className="artist-detail-page__error" role="alert">{error}</p> : null}

      {!isLoading && !error && !artist ? (
        <p className="artist-detail-page__empty">{t('artistDetail.notFound')}</p>
      ) : null}

      {!isLoading && !error && artist ? (
        <>
          <div className="artist-detail-hero">
            <div>
              <p className="eyebrow">{t('artistDetail.eyebrow')}</p>
              <h1>{artist.name}</h1>
              <p>{artist.country || t('artistDetail.unknownCountry')}</p>
            </div>
          </div>

          <dl className="artist-detail-grid">
            <div>
              <dt>{t('artists.beginYear')}</dt>
              <dd>{artist.beginYear ?? t('artists.unknown')}</dd>
            </div>
            <div>
              <dt>{t('artistDetail.endYear')}</dt>
              <dd>{artist.endYear ?? t('artistDetail.stillActive')}</dd>
            </div>
          </dl>

          <section className="artist-detail-notes">
            <h2>{t('artists.notes')}</h2>
            <p>{artist.notes || t('artists.noNotes')}</p>
          </section>
        </>
      ) : null}
    </section>
  );
}
