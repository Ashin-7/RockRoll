import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { MessageKey } from '../../i18n/messages';
import { getSongById } from './songs.service';
import { SongDetail, SongStatus } from './song.types';
import './SongDetailPage.css';

interface SongDetailPageProps {
  onLoadSong?: (songId: string) => Promise<SongDetail | null>;
  songId: string | null;
}

const songStatusMessageKeys: Record<SongStatus, MessageKey> = {
  planned: 'songs.status.planned',
  learning: 'songs.status.learning',
  polishing: 'songs.status.polishing',
  archived: 'songs.status.archived',
};

export function SongDetailPage({ onLoadSong = getSongById, songId }: SongDetailPageProps) {
  const { t } = useI18n();
  const [song, setSong] = useState<SongDetail | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(songId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!songId) {
      setSong(null);
      setIsLoading(false);
      setError('');
      return;
    }

    const currentSongId = songId;
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError('');

      try {
        const nextSong = await onLoadSong(currentSongId);
        if (isMounted) {
          setSong(nextSong);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : t('songDetail.loadError'));
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
  }, [onLoadSong, songId, t]);

  return (
    <section className="song-detail-page">
      <a className="song-detail-page__back" href="#songs">
        {t('songDetail.backToSongs')}
      </a>

      {isLoading ? <p className="song-detail-page__loading">{t('songDetail.loading')}</p> : null}
      {error ? <p className="song-detail-page__error" role="alert">{error}</p> : null}

      {!isLoading && !error && !song ? <p className="song-detail-page__empty">{t('songDetail.notFound')}</p> : null}

      {!isLoading && !error && song ? (
        <>
          <div className="song-detail-hero">
            <div>
              <p className="eyebrow">{t('songDetail.eyebrow')}</p>
              <h1>{song.title}</h1>
              <p>{song.artistName}</p>
            </div>
            <span>{t(songStatusMessageKeys[song.status])}</span>
          </div>

          <dl className="song-detail-grid">
            <div>
              <dt>{t('songs.difficulty')}</dt>
              <dd>{song.difficulty ? `${song.difficulty}/5` : t('songDetail.unknown')}</dd>
            </div>
            <div>
              <dt>{t('songDetail.releaseYear')}</dt>
              <dd>{song.releaseYear ?? t('songDetail.unknown')}</dd>
            </div>
            <div>
              <dt>{t('practice.bpm')}</dt>
              <dd>{song.bpm ?? t('songDetail.unknown')}</dd>
            </div>
          </dl>

          <section className="song-detail-notes">
            <h2>{t('songDetail.notes')}</h2>
            <p>{song.notes || t('songDetail.noNotes')}</p>
          </section>
        </>
      ) : null}
    </section>
  );
}
