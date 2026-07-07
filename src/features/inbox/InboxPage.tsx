import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { AnontravelerPreview } from './anontraveler.types';
import { mapAnontravelerPreviewCandidates, previewAnontravelerImport } from './anontraveler.service';
import { ImportUserRole } from './inbox.types';
import {
  commitPublicImportReviewPlan,
  createImportReviewPlan,
  getCurrentUserImportRole,
  saveImportCandidatesDraft,
} from './inbox.service';
import './InboxPage.css';

interface InboxPageProps {
  candidates?: unknown[];
  onPreviewAnontraveler?: (url: string) => Promise<AnontravelerPreview>;
  onSaveCandidatesDraft?: typeof saveImportCandidatesDraft;
  onCreateReviewPlan?: typeof createImportReviewPlan;
  onLoadImportRole?: typeof getCurrentUserImportRole;
  onCommitPublicImportReviewPlan?: typeof commitPublicImportReviewPlan;
}

function formatMessage(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (nextMessage, [key, value]) => nextMessage.replace(`{${key}}`, String(value)),
    template,
  );
}

function formatImportError(caughtError: unknown): string {
  const message = caughtError instanceof Error ? caughtError.message : 'Unable to import preview.';

  if (message.includes('import_jobs_source_name_check')) {
    return '需要应用数据库 migration：请应用 20260706021727_allow_anontraveler_import_source.sql，让 import_jobs.source_name 支持 anontraveler。';
  }

  return message;
}

export function InboxPage({
  candidates = [],
  onPreviewAnontraveler = previewAnontravelerImport,
  onSaveCandidatesDraft = saveImportCandidatesDraft,
  onCreateReviewPlan = createImportReviewPlan,
  onLoadImportRole = getCurrentUserImportRole,
  onCommitPublicImportReviewPlan = commitPublicImportReviewPlan,
}: InboxPageProps) {
  const { t } = useI18n();
  const [anontravelerUrl, setAnontravelerUrl] = useState('');
  const [anontravelerPreview, setAnontravelerPreview] = useState<AnontravelerPreview | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [importRole, setImportRole] = useState<ImportUserRole>('anonymous');
  const [commitMessage, setCommitMessage] = useState('');
  const [commitError, setCommitError] = useState('');
  const [isCommittingPublicImport, setIsCommittingPublicImport] = useState(false);

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

  const totalCandidateCount = anontravelerPreview
    ? anontravelerPreview.archiveItems.length
    : candidates.length;
  const sourceCount = anontravelerPreview ? 1 : 0;
  const previewReadyCount = anontravelerPreview ? 1 : 0;

  async function handleAnontravelerPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreviewError('');
    setCommitMessage('');
    setCommitError('');
    setAnontravelerPreview(null);
    setIsPreviewLoading(true);

    try {
      const preview = await onPreviewAnontraveler(anontravelerUrl.trim());
      setAnontravelerPreview(preview);
    } catch (caughtError) {
      setPreviewError(caughtError instanceof Error ? caughtError.message : t('inbox.anontravelerPreviewError'));
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function handleImportAnontravelerPreview() {
    if (!anontravelerPreview) {
      return;
    }

    const sourceUrl = anontravelerUrl.trim();
    const candidatesToImport = mapAnontravelerPreviewCandidates(anontravelerPreview);

    setCommitMessage('');
    setCommitError('');
    setIsCommittingPublicImport(true);

    try {
      const draft = await onSaveCandidatesDraft({
        sourceName: 'anontraveler',
        query: sourceUrl,
        candidates: candidatesToImport,
      });

      await onCreateReviewPlan({
        importJobId: draft.importJobId,
        sourceName: 'anontraveler',
        sourceUrl,
        candidates: candidatesToImport,
        archiveCollection: {
          externalId: anontravelerPreview.collection.externalId,
          title: anontravelerPreview.collection.title,
          description: anontravelerPreview.collection.description,
          collectionType: anontravelerPreview.collection.collectionType,
        },
        archiveItems: anontravelerPreview.archiveItems,
      });

      const result = await onCommitPublicImportReviewPlan();
      setAnontravelerPreview(null);
      setAnontravelerUrl('');
      setCommitMessage(
        formatMessage(t('inbox.fullImportSuccess'), {
          created: result.createdCount,
          matched: result.matchedCount,
          skipped: result.skippedCount,
        }),
      );
    } catch (caughtError) {
      setCommitError(formatImportError(caughtError));
    } finally {
      setIsCommittingPublicImport(false);
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
        <div className="inbox-hero__metrics" aria-label={t('inbox.workflowSectionsLabel')}>
          <div className="inbox-hero__summary">
            <strong>{totalCandidateCount}</strong>
            <span>{t('inbox.totalCandidates')}</span>
          </div>
          <div className="inbox-hero__summary">
            <strong>{sourceCount}</strong>
            <span>{t('inbox.previewSources')}</span>
          </div>
          <div className="inbox-hero__summary">
            <strong>{previewReadyCount}</strong>
            <span>{t('inbox.previewReady')}</span>
          </div>
        </div>
      </div>

      <div className="inbox-workflow">
        <p className="inbox-section-label">{t('inbox.workflowSectionsLabel')}</p>
        <form className="inbox-anontraveler-form" onSubmit={handleAnontravelerPreview}>
          <div className="inbox-panel-heading">
            <p>{t('inbox.anontravelerFormMode')}</p>
            <h2>{t('inbox.sourceSection')}</h2>
          </div>
          <label>
            {t('inbox.anontravelerUrlLabel')}
            <input
              required
              value={anontravelerUrl}
              onChange={(event) => setAnontravelerUrl(event.target.value)}
            />
          </label>
          <button type="submit" disabled={isPreviewLoading || isCommittingPublicImport}>
            {t('inbox.anontravelerPreviewSubmit')}
          </button>
        </form>
      </div>

      {isPreviewLoading ? <p>{t('inbox.anontravelerPreviewLoading')}</p> : null}
      {previewError ? <p role="alert">{previewError}</p> : null}

      <section className="inbox-anontraveler-preview">
        <div className="inbox-panel-heading">
          <p>{t('inbox.previewSection')}</p>
          <h2>{t('inbox.previewCollection')}</h2>
        </div>
        {anontravelerPreview ? (
          <>
            <p className="inbox-candidate-row__source">{t('inbox.source.anontraveler')}</p>
            <h3>{anontravelerPreview.collection.title}</h3>
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
              <h3>{t('inbox.previewAlbumSamples')}</h3>
              {anontravelerPreview.albums.slice(0, 3).map((album, albumIndex) => (
                <article className="inbox-album-preview-card" key={`${album.externalId}:${albumIndex}`}>
                  <p className="inbox-album-preview-card__rank"># {albumIndex + 1}</p>
                  <div className="inbox-album-preview-card__cover">
                    {album.coverUrl ? (
                      <img src={album.coverUrl} alt={`${album.title} 封面`} loading="lazy" />
                    ) : (
                      <span>无封面</span>
                    )}
                  </div>
                  <div className="inbox-album-preview-card__body">
                    <p className="inbox-album-preview-card__artist">{album.artistName}</p>
                    <h4>{album.title}</h4>
                    <div className="inbox-album-preview-card__meta" aria-label={`${album.title} metadata`}>
                      {album.releaseYear ? <span>[ {album.releaseYear} ]</span> : null}
                      {album.albumType ? <span>{album.albumType}</span> : null}
                      {album.styles.map((styleName) => (
                        <span key={styleName}>{styleName}</span>
                      ))}
                    </div>
                    {album.note ? <p className="inbox-album-preview-card__note">{album.note}</p> : null}
                  </div>
                </article>
              ))}
            </div>
            <div className="inbox-anontraveler-preview__actions">
              {importRole === 'admin' ? (
                <>
                  <button
                    type="button"
                    onClick={handleImportAnontravelerPreview}
                    disabled={isCommittingPublicImport || anontravelerPreview.archiveItems.length === 0}
                  >
                    {isCommittingPublicImport ? t('inbox.fullImportLoading') : t('inbox.fullImportSubmit')}
                  </button>
                  {isCommittingPublicImport ? <p role="status">{t('inbox.fullImportStatus')}</p> : null}
                </>
              ) : null}
            </div>
          </>
        ) : (
          <p className="inbox-preview-empty">{t('inbox.previewEmpty')}</p>
        )}
      </section>

      {commitMessage ? <p>{commitMessage}</p> : null}
      {commitError ? <p role="alert">{commitError}</p> : null}
    </section>
  );
}
