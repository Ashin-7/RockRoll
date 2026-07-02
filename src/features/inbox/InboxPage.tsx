import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { MessageKey } from '../../i18n/messages';
import { ImportCandidateSummary, ImportEntityType, ImportSource } from './inbox.types';
import { listImportCandidates } from './inbox.service';
import './InboxPage.css';

interface InboxPageProps {
  candidates?: ImportCandidateSummary[];
  onLoadCandidates?: () => Promise<ImportCandidateSummary[]>;
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

export function InboxPage({ candidates, onLoadCandidates = listImportCandidates }: InboxPageProps) {
  const { t } = useI18n();
  const hasProvidedCandidates = Array.isArray(candidates);
  const [loadedCandidates, setLoadedCandidates] = useState<ImportCandidateSummary[]>(candidates ?? []);
  const [isLoading, setIsLoading] = useState(!hasProvidedCandidates);
  const [error, setError] = useState('');

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
