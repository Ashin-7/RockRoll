import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { MessageKey } from '../../i18n/messages';
import { CreateSongInput, SongStatus, SongSummary } from './song.types';
import { createSong, listSongs } from './songs.service';
import { Panel, SectionHeading, StatCard } from '../../components/ui';
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
      <Panel variant="hero" as="header" className="songs-hero">
        <SectionHeading
          as="h1"
          className="songs-hero__heading"
          eyebrow={t('songs.eyebrow')}
          title={t('songs.title')}
        />
        <StatCard
          align="right"
          label=""
          value={displaySongs.length}
          detail={t('songs.currentRotation')}
          className="songs-hero__summary"
        />
      </Panel>

      <form className="songs-add-form" onSubmit={handleCreateSong}>
        <SectionHeading as="h2" className="songs-add-form__heading" title={t('songs.addTitle')} />

        <div className="songs-add-form__field songs-add-form__field--title">
          <label htmlFor="song-title">{t('songs.titleLabel')}</label>
          <input
            id="song-title"
            onChange={(event) => setTitle(event.target.value)}
            required
            type="text"
            value={title}
          />
        </div>

        <div className="songs-add-form__field">
          <label htmlFor="song-status">{t('songs.statusLabel')}</label>
          <select id="song-status" onChange={(event) => setStatus(event.target.value as SongStatus)} value={status}>
            {songStatuses.map((songStatus) => (
              <option key={songStatus} value={songStatus}>
                {t(songStatusMessageKeys[songStatus])}
              </option>
            ))}
          </select>
        </div>

        <div className="songs-add-form__field">
          <label htmlFor="song-difficulty">{t('songs.difficultyLabel')}</label>
          <select id="song-difficulty" onChange={(event) => setDifficulty(event.target.value)} value={difficulty}>
            <option value="">{t('songs.noDifficulty')}</option>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <button type="submit">{t('songs.addSubmit')}</button>
      </form>

      <div className="songs-feedback">
        {message ? <p className="songs-message" role="status">{message}</p> : null}
        {error ? <p className="songs-error" role="alert">{error}</p> : null}
        {isLoading ? <p className="songs-loading">{t('songs.loading')}</p> : null}
      </div>

      {!isLoading && displaySongs.length === 0 ? (
        <p className="songs-empty">{t('songs.empty')}</p>
      ) : null}

      {!isLoading && displaySongs.length > 0 ? (
        <Panel className="song-board" variant="card" role="list" aria-label={t('songs.title')}>
          <div className="song-board__header" aria-hidden="true">
            <span>{t('songs.titleLabel')}</span>
            <span>{t('songs.statusLabel')}</span>
            <span>{t('songs.difficultyLabel')}</span>
            <span>{t('songs.openDetail')}</span>
          </div>
          {displaySongs.map((song) => (
            <article className="song-card" key={song.id} role="listitem">
              <div className="song-card__identity">
                <div>
                  <h2>
                    <a href={`#song/${encodeURIComponent(song.id)}`}>{song.title}</a>
                  </h2>
                  <p className="song-card__artist">{song.artistName}</p>
                </div>
              </div>
              <span className="song-card__status">{t(songStatusMessageKeys[song.status])}</span>
              <div className="song-card__meta">
                {song.difficulty ? (
                  <span>
                    {song.difficulty}/5
                  </span>
                ) : (
                  <span>{t('songs.noDifficulty')}</span>
                )}
              </div>
              <a className="song-card__action" href={`#song/${encodeURIComponent(song.id)}`}>
                {t('songs.openDetail')}
              </a>
            </article>
          ))}
        </Panel>
      ) : null}
    </section>
  );
}
