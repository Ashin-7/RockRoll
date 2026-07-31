import { FormEvent, useEffect, useState } from 'react';
import { Panel, SectionHeading, StatCard } from '../../components/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { ArtistSummary, CreateArtistInput } from './artist.types';
import { createArtist, listArtists } from './artists.service';
import './ArtistListPage.css';

interface ArtistListPageProps {
  artists?: ArtistSummary[];
  onCreateArtist?: (input: CreateArtistInput) => Promise<void>;
  onLoadArtists?: () => Promise<ArtistSummary[]>;
}

function formatArtistActivity(artist: ArtistSummary, unknownLabel: string, stillActiveLabel: string): string {
  if (!artist.beginYear && !artist.endYear) {
    return unknownLabel;
  }

  if (artist.beginYear && !artist.endYear) {
    return `${artist.beginYear}-${stillActiveLabel}`;
  }

  if (!artist.beginYear && artist.endYear) {
    return `${unknownLabel}-${artist.endYear}`;
  }

  return `${artist.beginYear}-${artist.endYear}`;
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
      <Panel as="header" className="artists-hero" variant="hero">
        <SectionHeading
          as="h1"
          className="artists-hero__heading"
          eyebrow={t('artists.eyebrow')}
          title={t('artists.title')}
        />
        <StatCard
          align="right"
          className="artists-hero__summary"
          label={t('artists.total')}
          value={displayArtists.length}
        />
      </Panel>

      <form className="artists-add-form" onSubmit={handleCreateArtist}>
        <SectionHeading
          as="h2"
          className="artists-add-form__header"
          eyebrow={t('artists.formMode')}
          title={t('artists.addTitle')}
        />

        <div className="artists-add-form__section">
          <h3>{t('artists.identitySection')}</h3>
          <div className="artists-add-form__fields">
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
          </div>
        </div>

        <div className="artists-add-form__section">
          <h3>{t('artists.notesSection')}</h3>
          <div className="artists-add-form__fields artists-add-form__fields--notes">
            <label htmlFor="artist-notes">{t('artists.notesLabel')}</label>
            <input id="artist-notes" onChange={(event) => setNotes(event.target.value)} type="text" value={notes} />
            <button type="submit">{t('artists.addSubmit')}</button>
          </div>
        </div>
      </form>

      {message ? <p className="artists-message" role="status">{message}</p> : null}
      {error ? <p className="artists-error" role="alert">{error}</p> : null}
      {isLoading ? <p className="artists-loading">{t('artists.loading')}</p> : null}

      {!isLoading && displayArtists.length === 0 ? <p className="artists-empty">{t('artists.empty')}</p> : null}

      {!isLoading && displayArtists.length > 0 ? (
        <div className="artist-table-wrap">
          <table className="artist-table">
            <thead>
              <tr>
                <th scope="col">{t('artists.columnArtist')}</th>
                <th scope="col">{t('artists.columnCountry')}</th>
                <th scope="col">{t('artists.columnActivity')}</th>
                <th scope="col">{t('artists.columnNotes')}</th>
              </tr>
            </thead>
            <tbody>
              {displayArtists.map((artist) => (
                <tr key={artist.id}>
                  <th scope="row">
                    <a href={`#artist/${encodeURIComponent(artist.id)}`}>{artist.name}</a>
                  </th>
                  <td>{artist.country || t('artistDetail.unknownCountry')}</td>
                  <td>{formatArtistActivity(artist, t('artists.unknown'), t('artistDetail.stillActive'))}</td>
                  <td>{artist.notes || t('artists.noNotes')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
