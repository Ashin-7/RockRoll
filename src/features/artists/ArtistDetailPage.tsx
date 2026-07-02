import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { ArtistDetail, UpdateArtistInput } from './artist.types';
import { deleteArtist, getArtistById, updateArtist } from './artists.service';
import './ArtistDetailPage.css';

interface ArtistDetailPageProps {
  artistId: string | null;
  onDeleteArtist?: (artistId: string) => Promise<void>;
  onLoadArtist?: (artistId: string) => Promise<ArtistDetail | null>;
  onUpdateArtist?: (artistId: string, input: UpdateArtistInput) => Promise<void>;
}

export function ArtistDetailPage({
  artistId,
  onDeleteArtist = deleteArtist,
  onLoadArtist = getArtistById,
  onUpdateArtist = updateArtist,
}: ArtistDetailPageProps) {
  const { t } = useI18n();
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(artistId));
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [beginYear, setBeginYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [notes, setNotes] = useState('');

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
          setIsEditing(false);
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

  function startEditing(nextArtist: ArtistDetail) {
    setName(nextArtist.name);
    setCountry(nextArtist.country ?? '');
    setBeginYear(nextArtist.beginYear ? String(nextArtist.beginYear) : '');
    setEndYear(nextArtist.endYear ? String(nextArtist.endYear) : '');
    setNotes(nextArtist.notes);
    setIsEditing(true);
  }

  async function handleUpdateArtist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!artistId) {
      return;
    }

    const input: UpdateArtistInput = {
      name,
      country: country || null,
      beginYear: beginYear ? Number(beginYear) : null,
      endYear: endYear ? Number(endYear) : null,
      notes,
    };

    setIsSaving(true);
    setError('');

    try {
      await onUpdateArtist(artistId, input);
      setArtist(await onLoadArtist(artistId));
      setIsEditing(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('artistDetail.loadError'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteArtist() {
    if (!artistId || !window.confirm('Delete this artist? Related songs and albums will keep their history.')) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      await onDeleteArtist(artistId);
      window.location.hash = '#artists';
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('artistDetail.loadError'));
    } finally {
      setIsDeleting(false);
    }
  }

  function renderArtistActivity(nextArtist: ArtistDetail): string {
    if (!nextArtist.beginYear && !nextArtist.endYear) {
      return t('artists.unknown');
    }

    if (nextArtist.beginYear && !nextArtist.endYear) {
      return `${nextArtist.beginYear}-${t('artistDetail.stillActive')}`;
    }

    if (!nextArtist.beginYear && nextArtist.endYear) {
      return `${t('artists.unknown')}-${nextArtist.endYear}`;
    }

    return `${nextArtist.beginYear}-${nextArtist.endYear}`;
  }

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
            <div className="artist-detail-hero__actions">
              <button aria-label="Edit artist" onClick={() => startEditing(artist)} type="button">
                {t('artistDetail.edit')}
              </button>
              <button aria-label="Delete artist" disabled={isDeleting} onClick={handleDeleteArtist} type="button">
                {t('artistDetail.delete')}
              </button>
            </div>
          </div>

          {isEditing ? (
            <form className="artist-detail-edit-form" onSubmit={handleUpdateArtist}>
              <div className="artist-detail-edit-form__header">
                <div>
                  <p className="eyebrow">{t('artistDetail.formMode')}</p>
                  <h2>{t('artistDetail.editArtist')}</h2>
                </div>
                <p>{t('artistDetail.unsavedHint')}</p>
              </div>

              <div className="artist-detail-edit-form__section">
                <h3>{t('artists.identitySection')}</h3>
                <div className="artist-detail-edit-form__fields">
                  <label htmlFor="artist-detail-name">{t('artists.nameLabel')}</label>
                  <input id="artist-detail-name" onChange={(event) => setName(event.target.value)} required value={name} />

                  <label htmlFor="artist-detail-country">{t('artists.countryLabel')}</label>
                  <input id="artist-detail-country" onChange={(event) => setCountry(event.target.value)} value={country} />
                </div>
              </div>

              <div className="artist-detail-edit-form__section">
                <h3>{t('artistDetail.timelineSection')}</h3>
                <div className="artist-detail-edit-form__fields">
                  <label htmlFor="artist-detail-begin-year">{t('artists.beginYearLabel')}</label>
                  <input
                    id="artist-detail-begin-year"
                    min="0"
                    onChange={(event) => setBeginYear(event.target.value)}
                    type="number"
                    value={beginYear}
                  />

                  <label htmlFor="artist-detail-end-year">{t('artistDetail.endYear')}</label>
                  <input
                    id="artist-detail-end-year"
                    min="0"
                    onChange={(event) => setEndYear(event.target.value)}
                    type="number"
                    value={endYear}
                  />
                </div>
              </div>

              <div className="artist-detail-edit-form__section">
                <h3>{t('artists.notesSection')}</h3>
                <div className="artist-detail-edit-form__fields artist-detail-edit-form__fields--notes">
                  <label htmlFor="artist-detail-notes">{t('artists.notesLabel')}</label>
                  <textarea id="artist-detail-notes" onChange={(event) => setNotes(event.target.value)} value={notes} />
                  <button disabled={isSaving} type="submit">
                    {isSaving ? t('artistDetail.saving') : t('artistDetail.saveArtist')}
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          {!isEditing ? (
            <>
              <dl className="artist-detail-grid">
                <div>
                  <dt>{t('artists.beginYear')}</dt>
                  <dd>{artist.beginYear ?? t('artists.unknown')}</dd>
                </div>
                <div>
                  <dt>{t('artistDetail.endYear')}</dt>
                  <dd>{artist.endYear ?? t('artistDetail.stillActive')}</dd>
                </div>
                <div>
                  <dt>{t('artists.columnActivity')}</dt>
                  <dd>{renderArtistActivity(artist)}</dd>
                </div>
              </dl>

              <div className="artist-detail-panels">
                <section className="artist-detail-panel">
                  <h2>{t('artistDetail.timelineSection')}</h2>
                  <p>{renderArtistActivity(artist)}</p>
                </section>
                <section className="artist-detail-panel">
                  <h2>{t('artists.notes')}</h2>
                  <p>{artist.notes || t('artists.noNotes')}</p>
                </section>
                <section className="artist-detail-panel">
                  <h2>{t('artistDetail.relatedSection')}</h2>
                  <p>{t('artistDetail.relatedHint')}</p>
                </section>
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
