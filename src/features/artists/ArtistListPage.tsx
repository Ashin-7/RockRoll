import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { ArtistSummary, CreateArtistInput } from './artist.types';
import { createArtist, listArtists } from './artists.service';
import './ArtistListPage.css';

interface ArtistListPageProps {
  artists?: ArtistSummary[];
  onCreateArtist?: (input: CreateArtistInput) => Promise<void>;
  onLoadArtists?: () => Promise<ArtistSummary[]>;
}

export function ArtistListPage({
  artists,
  onCreateArtist = createArtist,
  onLoadArtists = listArtists,
}: ArtistListPageProps) {
  const { t } = useI18n();
  const hasProvidedArtists = Array.isArray(artists);
  const [loadedArtists, setLoadedArtists] = useState<ArtistSummary[]>(artists ?? []);
  const [isLoading, setIsLoading] = useState(!hasProvidedArtists);
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [beginYear, setBeginYear] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadRealArtists() {
    setIsLoading(true);
    setError('');

    try {
      setLoadedArtists(await onLoadArtists());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('artists.loadError'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (hasProvidedArtists) {
      setLoadedArtists(artists);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError('');

      try {
        const nextArtists = await onLoadArtists();
        if (isMounted) {
          setLoadedArtists(nextArtists);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : t('artists.loadError'));
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
  }, [artists, hasProvidedArtists, onLoadArtists, t]);

  async function handleCreateArtist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    const nextArtist = {
      name,
      country: country || null,
      beginYear: beginYear ? Number(beginYear) : null,
      notes,
    };

    try {
      await onCreateArtist(nextArtist);
      setName('');
      setCountry('');
      setBeginYear('');
      setNotes('');
      setMessage(t('artists.addSuccess'));

      if (!hasProvidedArtists) {
        await loadRealArtists();
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('artists.loadError'));
    }
  }

  const displayArtists = hasProvidedArtists ? artists : loadedArtists;

  return (
    <section className="artists-page">
      <div className="artists-hero">
        <div>
          <p className="eyebrow">{t('artists.eyebrow')}</p>
          <h1>{t('artists.title')}</h1>
        </div>
        <div className="artists-hero__summary">
          <strong>{displayArtists.length}</strong>
          <span>{t('artists.total')}</span>
        </div>
      </div>

      <form className="artists-add-form" onSubmit={handleCreateArtist}>
        <h2>{t('artists.addTitle')}</h2>
        <label htmlFor="artist-name">{t('artists.nameLabel')}</label>
        <input id="artist-name" onChange={(event) => setName(event.target.value)} required type="text" value={name} />

        <label htmlFor="artist-country">{t('artists.countryLabel')}</label>
        <input id="artist-country" onChange={(event) => setCountry(event.target.value)} type="text" value={country} />

        <label htmlFor="artist-begin-year">{t('artists.beginYearLabel')}</label>
        <input
          id="artist-begin-year"
          min="0"
          onChange={(event) => setBeginYear(event.target.value)}
          type="number"
          value={beginYear}
        />

        <label htmlFor="artist-notes">{t('artists.notesLabel')}</label>
        <input id="artist-notes" onChange={(event) => setNotes(event.target.value)} type="text" value={notes} />

        <button type="submit">{t('artists.addSubmit')}</button>
      </form>

      {message ? <p className="artists-message" role="status">{message}</p> : null}
      {error ? <p className="artists-error" role="alert">{error}</p> : null}
      {isLoading ? <p className="artists-loading">{t('artists.loading')}</p> : null}

      {!isLoading && displayArtists.length === 0 ? <p className="artists-empty">{t('artists.empty')}</p> : null}

      {!isLoading && displayArtists.length > 0 ? (
        <div className="artist-board">
          {displayArtists.map((artist) => (
            <article className="artist-card" key={artist.id}>
              <div className="artist-card__header">
                <h2>{artist.name}</h2>
                {artist.country ? <span>{artist.country}</span> : null}
              </div>
              <dl className="artist-card__meta">
                <div>
                  <dt>{t('artists.beginYear')}</dt>
                  <dd>{artist.beginYear ?? t('artists.unknown')}</dd>
                </div>
                <div>
                  <dt>{t('artists.notes')}</dt>
                  <dd>{artist.notes || t('artists.noNotes')}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
