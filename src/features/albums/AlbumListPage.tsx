import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { AlbumSummary, AlbumType, CreateAlbumInput } from './album.types';
import { createAlbum, listAlbums } from './albums.service';
import './AlbumListPage.css';

interface AlbumListPageProps {
  albums?: AlbumSummary[];
  onCreateAlbum?: (input: CreateAlbumInput) => Promise<void>;
  onLoadAlbums?: () => Promise<AlbumSummary[]>;
}

const albumTypes: AlbumType[] = ['album', 'ep', 'live', 'compilation'];
const albumTypeMessageKeys: Record<AlbumType, 'albums.type.album' | 'albums.type.ep' | 'albums.type.live' | 'albums.type.compilation'> = {
  album: 'albums.type.album',
  ep: 'albums.type.ep',
  live: 'albums.type.live',
  compilation: 'albums.type.compilation',
};

export function AlbumListPage({ albums, onCreateAlbum = createAlbum, onLoadAlbums = listAlbums }: AlbumListPageProps) {
  const { t } = useI18n();
  const hasProvidedAlbums = Array.isArray(albums);
  const [loadedAlbums, setLoadedAlbums] = useState<AlbumSummary[]>(albums ?? []);
  const [isLoading, setIsLoading] = useState(!hasProvidedAlbums);
  const [title, setTitle] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [albumType, setAlbumType] = useState<AlbumType>('album');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadRealAlbums() {
    setIsLoading(true);
    setError('');

    try {
      setLoadedAlbums(await onLoadAlbums());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('albums.loadError'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (hasProvidedAlbums) {
      setLoadedAlbums(albums);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError('');

      try {
        const nextAlbums = await onLoadAlbums();
        if (isMounted) {
          setLoadedAlbums(nextAlbums);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : t('albums.loadError'));
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
  }, [albums, hasProvidedAlbums, onLoadAlbums, t]);

  async function handleCreateAlbum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    const nextAlbum: CreateAlbumInput = {
      title,
      artistId: null,
      releaseYear: releaseYear ? Number(releaseYear) : null,
      albumType,
      notes,
    };

    try {
      await onCreateAlbum(nextAlbum);
      setTitle('');
      setReleaseYear('');
      setAlbumType('album');
      setNotes('');
      setMessage(t('albums.addSuccess'));

      if (!hasProvidedAlbums) {
        await loadRealAlbums();
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('albums.loadError'));
    }
  }

  const displayAlbums = hasProvidedAlbums ? albums : loadedAlbums;

  return (
    <section className="albums-page">
      <div className="albums-hero">
        <div>
          <p className="eyebrow">{t('albums.eyebrow')}</p>
          <h1>{t('albums.title')}</h1>
        </div>
        <div className="albums-hero__summary">
          <strong>{displayAlbums.length}</strong>
          <span>{t('albums.total')}</span>
        </div>
      </div>

      <form className="albums-add-form" onSubmit={handleCreateAlbum}>
        <div className="albums-add-form__header">
          <p>{t('albums.formMode')}</p>
          <h2>{t('albums.addTitle')}</h2>
        </div>

        <fieldset className="albums-form-section">
          <legend>
            <h3>{t('albums.identitySection')}</h3>
          </legend>
          <div className="albums-form-grid">
            <label htmlFor="album-title">
              {t('albums.titleLabel')}
              <input id="album-title" onChange={(event) => setTitle(event.target.value)} required value={title} />
            </label>

            <label htmlFor="album-release-year">
              {t('albums.releaseYearLabel')}
              <input
                id="album-release-year"
                min="0"
                onChange={(event) => setReleaseYear(event.target.value)}
                type="number"
                value={releaseYear}
              />
            </label>

            <label htmlFor="album-type">
              {t('albums.typeLabel')}
              <select id="album-type" onChange={(event) => setAlbumType(event.target.value as AlbumType)} value={albumType}>
                {albumTypes.map((type) => (
                  <option key={type} value={type}>
                    {t(albumTypeMessageKeys[type])}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="albums-form-section">
          <legend>
            <h3>{t('albums.notesSection')}</h3>
          </legend>
          <label htmlFor="album-notes">
            {t('albums.notesLabel')}
            <input id="album-notes" onChange={(event) => setNotes(event.target.value)} value={notes} />
          </label>
        </fieldset>

        <div className="albums-add-form__actions">
          <button type="submit">{t('albums.addSubmit')}</button>
        </div>
      </form>

      {message ? <p className="albums-message" role="status">{message}</p> : null}
      {error ? <p className="albums-error" role="alert">{error}</p> : null}
      {isLoading ? <p className="albums-loading">{t('albums.loading')}</p> : null}

      {!isLoading && displayAlbums.length === 0 ? <p className="albums-empty">{t('albums.empty')}</p> : null}

      {!isLoading && displayAlbums.length > 0 ? (
        <div className="albums-table-wrap">
          <table className="albums-table">
            <thead>
              <tr>
                <th scope="col">{t('albums.columnAlbum')}</th>
                <th scope="col">{t('albums.columnArtist')}</th>
                <th scope="col">{t('albums.columnRelease')}</th>
                <th scope="col">{t('albums.columnType')}</th>
                <th scope="col">{t('albums.columnNotes')}</th>
              </tr>
            </thead>
            <tbody>
              {displayAlbums.map((album) => (
                <tr key={album.id}>
                  <td className="albums-table__title">
                    <a href={`#album/${encodeURIComponent(album.id)}`}>{album.title}</a>
                  </td>
                  <td>{album.artistName || t('albums.unknown')}</td>
                  <td>{album.releaseYear ?? t('albums.unknown')}</td>
                  <td>
                    <span className="albums-table__badge">{t(albumTypeMessageKeys[album.albumType])}</span>
                  </td>
                  <td>{album.notes || t('albums.noNotes')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
