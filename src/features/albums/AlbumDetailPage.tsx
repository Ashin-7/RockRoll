import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { getCurrentUserImportRole } from '../inbox/inbox.service';
import { ImportUserRole } from '../inbox/inbox.types';
import { AlbumDetail, AlbumType, UpdateAlbumInput } from './album.types';
import { deleteAlbum, getAlbumById, updateAlbum } from './albums.service';
import { Button } from '../../components/ui';
import './AlbumDetailPage.css';

interface AlbumDetailPageProps {
  albumId: string | null;
  onDeleteAlbum?: (albumId: string) => Promise<void>;
  onLoadAlbum?: (albumId: string) => Promise<AlbumDetail | null>;
  onLoadImportRole?: typeof getCurrentUserImportRole;
  onUpdateAlbum?: (albumId: string, input: UpdateAlbumInput) => Promise<void>;
}

const albumTypes: AlbumType[] = ['album', 'ep', 'live', 'compilation'];
const albumTypeMessageKeys: Record<AlbumType, 'albums.type.album' | 'albums.type.ep' | 'albums.type.live' | 'albums.type.compilation'> = {
  album: 'albums.type.album',
  ep: 'albums.type.ep',
  live: 'albums.type.live',
  compilation: 'albums.type.compilation',
};

export function AlbumDetailPage({
  albumId,
  onDeleteAlbum = deleteAlbum,
  onLoadAlbum = getAlbumById,
  onLoadImportRole = getCurrentUserImportRole,
  onUpdateAlbum = updateAlbum,
}: AlbumDetailPageProps) {
  const { t } = useI18n();
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(albumId));
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [albumType, setAlbumType] = useState<AlbumType>('album');
  const [notes, setNotes] = useState('');
  const [importRole, setImportRole] = useState<ImportUserRole>('anonymous');

  useEffect(() => {
    if (!albumId) {
      setAlbum(null);
      setIsLoading(false);
      setError('');
      return;
    }

    const currentAlbumId = albumId;
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError('');

      try {
        const nextAlbum = await onLoadAlbum(currentAlbumId);
        if (isMounted) {
          setAlbum(nextAlbum);
          setIsEditing(false);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : t('albumDetail.loadError'));
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
  }, [albumId, onLoadAlbum, t]);

  useEffect(() => {
    let isMounted = true;

    async function loadRole() {
      try {
        const nextRole = await onLoadImportRole();
        if (isMounted) {
          setImportRole(nextRole);
        }
      } catch {
        if (isMounted) {
          setImportRole('anonymous');
        }
      }
    }

    loadRole();

    return () => {
      isMounted = false;
    };
  }, [onLoadImportRole]);

  function startEditing(nextAlbum: AlbumDetail) {
    setTitle(nextAlbum.title);
    setReleaseYear(nextAlbum.releaseYear ? String(nextAlbum.releaseYear) : '');
    setAlbumType(nextAlbum.albumType);
    setNotes(nextAlbum.notes);
    setIsEditing(true);
  }

  async function handleUpdateAlbum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!albumId) {
      return;
    }

    const input: UpdateAlbumInput = {
      title,
      artistId: null,
      releaseYear: releaseYear ? Number(releaseYear) : null,
      albumType,
      notes,
    };

    setIsSaving(true);
    setError('');

    try {
      await onUpdateAlbum(albumId, input);
      setAlbum(await onLoadAlbum(albumId));
      setIsEditing(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('albumDetail.loadError'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAlbum() {
    if (!albumId || !window.confirm('Delete this album? Related songs will keep their history.')) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      await onDeleteAlbum(albumId);
      window.location.hash = '#albums';
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('albumDetail.loadError'));
    } finally {
      setIsDeleting(false);
    }
  }

  const canManageAlbum = importRole === 'admin';

  return (
    <section className="album-detail-page">
      <a className="album-detail-page__back" href="#albums">
        {t('albumDetail.backToAlbums')}
      </a>

      {isLoading ? <p className="album-detail-page__loading">{t('albumDetail.loading')}</p> : null}
      {error ? <p className="album-detail-page__error" role="alert">{error}</p> : null}

      {!isLoading && !error && !album ? <p className="album-detail-page__empty">{t('albumDetail.notFound')}</p> : null}

      {!isLoading && !error && album ? (
        <>
          <div className="album-detail-hero">
            <div>
              <p className="eyebrow">{t('albumDetail.eyebrow')}</p>
              <h1>{album.title}</h1>
              <p>{album.artistName || t('albums.unknown')}</p>
            </div>
            <div className="album-detail-hero__actions">
              <span>{t(albumTypeMessageKeys[album.albumType])}</span>
              {canManageAlbum ? (
                <>
                  <Button aria-label="Edit album" onClick={() => startEditing(album)} type="button">
                    {t('albumDetail.edit')}
                  </Button>
                  <Button variant="ghost" aria-label="Delete album" disabled={isDeleting} onClick={handleDeleteAlbum} type="button">
                    {t('albumDetail.delete')}
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          {canManageAlbum && isEditing ? (
            <form className="album-detail-edit-form" onSubmit={handleUpdateAlbum}>
              <div className="album-detail-edit-form__header">
                <p>{t('albumDetail.formMode')}</p>
                <h2>{t('albumDetail.editAlbum')}</h2>
              </div>

              <fieldset className="album-detail-form-section">
                <legend>
                  <h3>{t('albums.identitySection')}</h3>
                </legend>
                <label htmlFor="album-detail-title">
                  {t('albums.titleLabel')}
                  <input id="album-detail-title" onChange={(event) => setTitle(event.target.value)} required value={title} />
                </label>
              </fieldset>

              <fieldset className="album-detail-form-section">
                <legend>
                  <h3>{t('albumDetail.releaseProfileSection')}</h3>
                </legend>
                <div className="album-detail-form-grid">
                  <label htmlFor="album-detail-release-year">
                    {t('albums.releaseYearLabel')}
                    <input
                      id="album-detail-release-year"
                      min="0"
                      onChange={(event) => setReleaseYear(event.target.value)}
                      type="number"
                      value={releaseYear}
                    />
                  </label>

                  <label htmlFor="album-detail-type">
                    {t('albums.typeLabel')}
                    <select
                      id="album-detail-type"
                      onChange={(event) => setAlbumType(event.target.value as AlbumType)}
                      value={albumType}
                    >
                      {albumTypes.map((type) => (
                        <option key={type} value={type}>
                          {t(albumTypeMessageKeys[type])}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </fieldset>

              <fieldset className="album-detail-form-section">
                <legend>
                  <h3>{t('albums.notesSection')}</h3>
                </legend>
                <label htmlFor="album-detail-notes">
                  {t('albums.notesLabel')}
                  <textarea id="album-detail-notes" onChange={(event) => setNotes(event.target.value)} value={notes} />
                </label>
              </fieldset>

              <div className="album-detail-edit-form__actions">
                <span>{t('albumDetail.unsavedHint')}</span>
                <Button variant="primary" disabled={isSaving} type="submit">
                  {isSaving ? t('albumDetail.saving') : t('albumDetail.saveAlbum')}
                </Button>
              </div>
            </form>
          ) : null}

          <dl className="album-detail-grid">
            <div>
              <dt>{t('albums.releaseYear')}</dt>
              <dd>{album.releaseYear ?? t('albums.unknown')}</dd>
            </div>
            <div>
              <dt>{t('albumDetail.albumType')}</dt>
              <dd>{t(albumTypeMessageKeys[album.albumType])}</dd>
            </div>
            <div>
              <dt>{t('albums.columnArtist')}</dt>
              <dd>{album.artistName || t('albums.unknown')}</dd>
            </div>
          </dl>

          <div className="album-detail-panels">
            <section className="album-detail-panel">
              <h2>{t('albums.notesSection')}</h2>
              <p>{album.notes || t('albums.noNotes')}</p>
            </section>
            <section className="album-detail-panel">
              <h2>{t('albumDetail.relatedSection')}</h2>
              <p>{t('albumDetail.relatedHint')}</p>
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}
