import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { MessageKey } from '../../i18n/messages';
import { AnontravelerPreview } from './anontraveler.types';
import { previewAnontravelerImport } from './anontraveler.service';
import { ImportCandidateSummary, ImportEntityType, ImportSource } from './inbox.types';
import { listImportCandidates } from './inbox.service';
import './InboxPage.css';

interface InboxPageProps {
  candidates?: ImportCandidateSummary[];
  onLoadCandidates?: () => Promise<ImportCandidateSummary[]>;
  onPreviewAnontraveler?: (url: string) => Promise<AnontravelerPreview>;
}

const entityTypeMessageKeys: Record<ImportEntityType, MessageKey> = {
  artist: 'inbox.entity.artist',
  album: 'inbox.entity.album',
  song: 'inbox.entity.song',
};

const sourceMessageKeys: Record<ImportSource, MessageKey> = {
  musicbrainz: 'inbox.source.musicbrainz',
  discogs: 'inbox.source.discogs',
  spotify: 'inbox.source.spotify',
};

export function InboxPage({
  candidates,
  onLoadCandidates = listImportCandidates,
  onPreviewAnontraveler = previewAnontravelerImport,
}: InboxPageProps) {
  const { t } = useI18n();
  const hasProvidedCandidates = Array.isArray(candidates);
  const [loadedCandidates, setLoadedCandidates] = useState<ImportCandidateSummary[]>(candidates ?? []);
  const [isLoading, setIsLoading] = useState(!hasProvidedCandidates);
  const [error, setError] = useState('');
  const [anontravelerUrl, setAnontravelerUrl] = useState('');
  const [anontravelerPreview, setAnontravelerPreview] = useState<AnontravelerPreview | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  useEffect(() => {
    if (hasProvidedCandidates) {
      setLoadedCandidates(candidates);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError('');

      try {
        const nextCandidates = await onLoadCandidates();
        if (isMounted) {
          setLoadedCandidates(nextCandidates);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : t('inbox.loadError'));
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
  }, [candidates, hasProvidedCandidates, onLoadCandidates, t]);

  const displayCandidates = hasProvidedCandidates ? candidates : loadedCandidates;

  async function handleAnontravelerPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreviewError('');
    setAnontravelerPreview(null);
    setIsPreviewLoading(true);

    try {
      setAnontravelerPreview(await onPreviewAnontraveler(anontravelerUrl.trim()));
    } catch (caughtError) {
      setPreviewError(caughtError instanceof Error ? caughtError.message : t('inbox.anontravelerPreviewError'));
    } finally {
      setIsPreviewLoading(false);
    }
  }

  return (
    <section className="inbox-page">
      <div className="inbox-hero">
        <div>
          <p className="eyebrow">{t('inbox.eyebrow')}</p>
          <h1>{t('inbox.title')}</h1>
          <p>{t('inbox.description')}</p>
        </div>
        <div className="inbox-hero__summary">
          <strong>{displayCandidates.length}</strong>
          <span>{t('inbox.pendingCandidates')}</span>
        </div>
      </div>

      <form className="inbox-anontraveler-form" onSubmit={handleAnontravelerPreview}>
        <h2>{t('inbox.anontravelerTitle')}</h2>
        <label>
          {t('inbox.anontravelerUrlLabel')}
          <input
            required
            value={anontravelerUrl}
            onChange={(event) => setAnontravelerUrl(event.target.value)}
          />
        </label>
        <button type="submit">{t('inbox.anontravelerPreviewSubmit')}</button>
      </form>

      {isPreviewLoading ? <p>{t('inbox.anontravelerPreviewLoading')}</p> : null}
      {previewError ? <p role="alert">{previewError}</p> : null}
      {anontravelerPreview ? (
        <section className="inbox-anontraveler-preview">
          <p className="inbox-candidate-card__source">{t('inbox.source.anontraveler')}</p>
          <h2>{anontravelerPreview.collection.title}</h2>
          {anontravelerPreview.collection.description ? <p>{anontravelerPreview.collection.description}</p> : null}
          <div className="inbox-anontraveler-preview__counts">
            <p>{t('inbox.anontravelerArtistsCount').replace('{count}', String(anontravelerPreview.artists.length))}</p>
            <p>{t('inbox.anontravelerAlbumsCount').replace('{count}', String(anontravelerPreview.albums.length))}</p>
            <p>
              {t('inbox.anontravelerArchiveItemsCount').replace(
                '{count}',
                String(anontravelerPreview.archiveItems.length),
              )}
            </p>
            <p>{t('inbox.anontravelerSkippedSongsCount').replace('{count}', String(anontravelerPreview.skippedSongs))}</p>
          </div>
          <div className="inbox-anontraveler-preview__albums">
            {anontravelerPreview.albums.slice(0, 5).map((album) => (
              <article key={album.externalId}>
                <h3>{album.title}</h3>
                <p>{album.artistName}</p>
                {album.releaseYear ? <p>{album.releaseYear}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {error ? <p className="inbox-error" role="alert">{error}</p> : null}
      {isLoading ? <p className="inbox-loading">{t('inbox.loading')}</p> : null}

      {!isLoading && displayCandidates.length === 0 ? <p className="inbox-empty">{t('inbox.empty')}</p> : null}

      {!isLoading && displayCandidates.length > 0 ? (
        <div className="inbox-candidate-list">
          {displayCandidates.map((candidate) => (
            <article className="inbox-candidate-card" key={candidate.id}>
              <div>
                <p className="inbox-candidate-card__source">{t(sourceMessageKeys[candidate.sourceName])}</p>
                <h2>{candidate.displayTitle}</h2>
                {candidate.displaySubtitle ? <p>{candidate.displaySubtitle}</p> : null}
              </div>
              <span>{t(entityTypeMessageKeys[candidate.entityType])}</span>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
