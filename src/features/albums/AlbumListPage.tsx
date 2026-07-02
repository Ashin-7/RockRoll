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
        <h2>{t('albums.addTitle')}</h2>
        <label htmlFor="album-title">{t('albums.titleLabel')}</label>
        <input id="album-title" onChange={(event) => setTitle(event.target.value)} required value={title} />

        <label htmlFor="album-release-year">{t('albums.releaseYearLabel')}</label>
        <input
          id="album-release-year"
          min="0"
          onChange={(event) => setReleaseYear(event.target.value)}
          type="number"
          value={releaseYear}
        />

        <label htmlFor="album-type">{t('albums.typeLabel')}</label>
        <select id="album-type" onChange={(event) => setAlbumType(event.target.value as AlbumType)} value={albumType}>
          {albumTypes.map((type) => (
            <option key={type} value={type}>
              {t(albumTypeMessageKeys[type])}
            </option>
          ))}
        </select>

        <label htmlFor="album-notes">{t('albums.notesLabel')}</label>
        <input id="album-notes" onChange={(event) => setNotes(event.target.value)} value={notes} />

        <button type="submit">{t('albums.addSubmit')}</button>
      </form>

      {message ? <p className="albums-message" role="status">{message}</p> : null}
      {error ? <p className="albums-error" role="alert">{error}</p> : null}
      {isLoading ? <p className="albums-loading">{t('albums.loading')}</p> : null}

      {!isLoading && displayAlbums.length === 0 ? <p className="albums-empty">{t('albums.empty')}</p> : null}

      {!isLoading && displayAlbums.length > 0 ? (
        <div className="album-board">
          {displayAlbums.map((album) => (
            <article className="album-card" key={album.id}>
              <div className="album-card__header">
                <div>
                  <h2>
                    <a href={`#album/${encodeURIComponent(album.id)}`}>{album.title}</a>
                  </h2>
                  <p>{album.artistName}</p>
                </div>
                <span>{t(albumTypeMessageKeys[album.albumType])}</span>
              </div>
              <dl className="album-card__meta">
                <div>
                  <dt>{t('albums.releaseYear')}</dt>
                  <dd>{album.releaseYear ?? t('albums.unknown')}</dd>
                </div>
                <div>
                  <dt>{t('albums.notes')}</dt>
                  <dd>{album.notes || t('albums.noNotes')}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
