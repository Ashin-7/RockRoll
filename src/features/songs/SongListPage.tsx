import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { MessageKey } from '../../i18n/messages';
import { CreateSongInput, SongStatus, SongSummary } from './song.types';
import { createSong, listSongs } from './songs.service';
import './SongListPage.css';

interface SongListPageProps {
  songs?: SongSummary[];
  onCreateSong?: (input: CreateSongInput) => Promise<void>;
  onLoadSongs?: () => Promise<SongSummary[]>;
}

const songStatusMessageKeys: Record<SongStatus, MessageKey> = {
  planned: 'songs.status.planned',
  learning: 'songs.status.learning',
  polishing: 'songs.status.polishing',
  archived: 'songs.status.archived',
};

const songStatuses: SongStatus[] = ['planned', 'learning', 'polishing', 'archived'];

export function SongListPage({ songs, onCreateSong = createSong, onLoadSongs = listSongs }: SongListPageProps) {
  const { t } = useI18n();
  const hasProvidedSongs = Array.isArray(songs);
  const [loadedSongs, setLoadedSongs] = useState<SongSummary[]>(songs ?? []);
  const [isLoading, setIsLoading] = useState(!hasProvidedSongs);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<SongStatus>('planned');
  const [difficulty, setDifficulty] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadRealSongs() {
    setIsLoading(true);
    setError('');

    try {
      setLoadedSongs(await onLoadSongs());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('songs.loadError'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (hasProvidedSongs) {
      setLoadedSongs(songs);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError('');

      try {
        const nextSongs = await onLoadSongs();
        if (isMounted) {
          setLoadedSongs(nextSongs);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : t('songs.loadError'));
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
  }, [hasProvidedSongs, onLoadSongs, songs, t]);

  async function handleCreateSong(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    const nextSong = {
      title,
      status,
      difficulty: difficulty ? Number(difficulty) : null,
    };

    try {
      await onCreateSong(nextSong);
      setTitle('');
      setStatus('planned');
      setDifficulty('');
      setMessage(t('songs.addSuccess'));

      if (!hasProvidedSongs) {
        await loadRealSongs();
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('songs.loadError'));
    }
  }

  const displaySongs = hasProvidedSongs ? songs : loadedSongs;

  return (
    <section className="songs-page">
      <div className="songs-hero">
        <div>
          <p className="eyebrow">{t('songs.eyebrow')}</p>
          <h1>{t('songs.title')}</h1>
        </div>
        <div className="songs-hero__summary">
          <strong>{displaySongs.length}</strong>
          <span>{t('songs.currentRotation')}</span>
        </div>
      </div>

      <form className="songs-add-form" onSubmit={handleCreateSong}>
        <h2>{t('songs.addTitle')}</h2>
        <label htmlFor="song-title">{t('songs.titleLabel')}</label>
        <input
          id="song-title"
          onChange={(event) => setTitle(event.target.value)}
          required
          type="text"
          value={title}
        />

        <label htmlFor="song-status">{t('songs.statusLabel')}</label>
        <select id="song-status" onChange={(event) => setStatus(event.target.value as SongStatus)} value={status}>
          {songStatuses.map((songStatus) => (
            <option key={songStatus} value={songStatus}>
              {t(songStatusMessageKeys[songStatus])}
            </option>
          ))}
        </select>

        <label htmlFor="song-difficulty">{t('songs.difficultyLabel')}</label>
        <select id="song-difficulty" onChange={(event) => setDifficulty(event.target.value)} value={difficulty}>
          <option value="">{t('songs.noDifficulty')}</option>
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <button type="submit">{t('songs.addSubmit')}</button>
      </form>

      {message ? <p className="songs-message" role="status">{message}</p> : null}
      {error ? <p className="songs-error" role="alert">{error}</p> : null}
      {isLoading ? <p className="songs-loading">{t('songs.loading')}</p> : null}

      {!isLoading && displaySongs.length === 0 ? (
        <p className="songs-empty">{t('songs.empty')}</p>
      ) : null}

      {!isLoading && displaySongs.length > 0 ? (
        <div className="song-board">
          {displaySongs.map((song) => (
            <article className="song-card" key={song.id}>
              <div className="song-card__header">
                <div>
                  <h2>
                    <a href={`#song/${encodeURIComponent(song.id)}`}>{song.title}</a>
                  </h2>
                  <p className="song-card__artist">{song.artistName}</p>
                </div>
                <span className="song-card__status">{t(songStatusMessageKeys[song.status])}</span>
              </div>
              <div className="song-card__meta">
                {song.difficulty ? (
                  <span>
                    {t('songs.difficulty')} {song.difficulty}/5
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
