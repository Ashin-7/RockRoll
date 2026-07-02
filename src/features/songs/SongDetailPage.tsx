import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { MessageKey } from '../../i18n/messages';
import { deleteSong, getSongById, updateSong } from './songs.service';
import { SongDetail, SongStatus, UpdateSongInput } from './song.types';
import './SongDetailPage.css';

interface SongDetailPageProps {
  onDeleteSong?: (songId: string) => Promise<void>;
  onLoadSong?: (songId: string) => Promise<SongDetail | null>;
  onUpdateSong?: (songId: string, input: UpdateSongInput) => Promise<void>;
  songId: string | null;
}

const songStatusMessageKeys: Record<SongStatus, MessageKey> = {
  planned: 'songs.status.planned',
  learning: 'songs.status.learning',
  polishing: 'songs.status.polishing',
  archived: 'songs.status.archived',
};

const songStatuses: SongStatus[] = ['planned', 'learning', 'polishing', 'archived'];

export function SongDetailPage({
  onDeleteSong = deleteSong,
  onLoadSong = getSongById,
  onUpdateSong = updateSong,
  songId,
}: SongDetailPageProps) {
  const { t } = useI18n();
  const [song, setSong] = useState<SongDetail | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(songId));
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<SongStatus>('planned');
  const [difficulty, setDifficulty] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [bpm, setBpm] = useState('');
  const [notes, setNotes] = useState('');

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
          setIsEditing(false);
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

  function startEditing(nextSong: SongDetail) {
    setTitle(nextSong.title);
    setStatus(nextSong.status);
    setDifficulty(nextSong.difficulty ? String(nextSong.difficulty) : '');
    setReleaseYear(nextSong.releaseYear ? String(nextSong.releaseYear) : '');
    setBpm(nextSong.bpm ? String(nextSong.bpm) : '');
    setNotes(nextSong.notes);
    setIsEditing(true);
  }

  async function handleUpdateSong(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!songId) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await onUpdateSong(songId, {
        title,
        status,
        difficulty: difficulty ? Number(difficulty) : null,
        releaseYear: releaseYear ? Number(releaseYear) : null,
        bpm: bpm ? Number(bpm) : null,
        notes,
      });
      setSong(await onLoadSong(songId));
      setIsEditing(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('songs.loadError'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteSong() {
    if (!songId || !window.confirm('Delete this song? Practice sessions will stay in history.')) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      await onDeleteSong(songId);
      window.location.hash = '#songs';
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('songs.loadError'));
    } finally {
      setIsDeleting(false);
    }
  }

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
            <div className="song-detail-hero__actions">
              <span>{t(songStatusMessageKeys[song.status])}</span>
              <button aria-label={t('songDetail.editSong')} onClick={() => startEditing(song)} type="button">
                {t('songDetail.edit')}
              </button>
              <button aria-label={t('songDetail.deleteSong')} disabled={isDeleting} onClick={handleDeleteSong} type="button">
                {t('songDetail.delete')}
              </button>
            </div>
          </div>

          {isEditing ? (
            <form className="song-detail-edit-form" onSubmit={handleUpdateSong}>
              <div className="song-detail-edit-form__header">
                <p className="eyebrow">{t('songDetail.formMode')}</p>
                <h2>{t('songDetail.editSong')}</h2>
              </div>

              <section className="song-detail-edit-form__section">
                <h3>{t('songDetail.identitySection')}</h3>
                <div className="song-detail-edit-form__field">
                  <label htmlFor="song-detail-title">{t('songs.titleLabel')}</label>
                  <input id="song-detail-title" onChange={(event) => setTitle(event.target.value)} required value={title} />
                </div>
              </section>

              <section className="song-detail-edit-form__section song-detail-edit-form__section--grid">
                <h3>{t('songDetail.practiceProfileSection')}</h3>
                <div className="song-detail-edit-form__field">
                  <label htmlFor="song-detail-status">{t('songs.statusLabel')}</label>
                  <select id="song-detail-status" onChange={(event) => setStatus(event.target.value as SongStatus)} value={status}>
                    {songStatuses.map((songStatus) => (
                      <option key={songStatus} value={songStatus}>
                        {t(songStatusMessageKeys[songStatus])}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="song-detail-edit-form__field">
                  <label htmlFor="song-detail-difficulty">{t('songs.difficultyLabel')}</label>
                  <input
                    id="song-detail-difficulty"
                    max="5"
                    min="1"
                    onChange={(event) => setDifficulty(event.target.value)}
                    type="number"
                    value={difficulty}
                  />
                </div>

                <div className="song-detail-edit-form__field">
                  <label htmlFor="song-detail-release-year">{t('songDetail.releaseYear')}</label>
                  <input
                    id="song-detail-release-year"
                    onChange={(event) => setReleaseYear(event.target.value)}
                    type="number"
                    value={releaseYear}
                  />
                </div>

                <div className="song-detail-edit-form__field">
                  <label htmlFor="song-detail-bpm">{t('practice.bpm')}</label>
                  <input id="song-detail-bpm" min="1" onChange={(event) => setBpm(event.target.value)} type="number" value={bpm} />
                </div>
              </section>

              <section className="song-detail-edit-form__section">
                <h3>{t('songDetail.notes')}</h3>
                <div className="song-detail-edit-form__field">
                  <label htmlFor="song-detail-notes">{t('songDetail.notes')}</label>
                  <textarea id="song-detail-notes" onChange={(event) => setNotes(event.target.value)} value={notes} />
                </div>
              </section>

              <div className="song-detail-edit-form__actions">
                <span>{isSaving ? t('songDetail.saving') : t('songDetail.unsavedHint')}</span>
                <button disabled={isSaving} type="submit">
                  {t('songDetail.saveSong')}
                </button>
              </div>
            </form>
          ) : null}

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
            <div>
              <h2>{t('songDetail.notes')}</h2>
              <p>{song.notes || t('songDetail.noNotes')}</p>
            </div>
            <aside className="song-detail-related" aria-label={t('songDetail.related')}>
              <h2>{t('songDetail.related')}</h2>
              <p>{t('songDetail.relatedHint')}</p>
            </aside>
          </section>
        </>
      ) : null}
    </section>
  );
}
