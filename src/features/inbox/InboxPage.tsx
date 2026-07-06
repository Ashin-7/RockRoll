import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { MessageKey } from '../../i18n/messages';
import { AnontravelerPreview } from './anontraveler.types';
import { mapAnontravelerPreviewCandidates, previewAnontravelerImport } from './anontraveler.service';
import {
  ImportCandidateSummary,
  ImportDraftJobSummary,
  ImportEntityType,
  ImportReviewItemSummary,
  ImportReviewPlannedAction,
  ImportSource,
  ImportUserRole,
} from './inbox.types';
import {
  commitPublicImportReviewPlan,
  createImportReviewPlan,
  getCurrentUserImportRole,
  listImportCandidates,
  listImportDraftJobs,
  saveImportCandidatesDraft,
  updateImportReviewItemAction,
} from './inbox.service';
import './InboxPage.css';

interface InboxPageProps {
  candidates?: ImportCandidateSummary[];
  onLoadCandidates?: () => Promise<ImportCandidateSummary[]>;
  onPreviewAnontraveler?: (url: string) => Promise<AnontravelerPreview>;
  onSaveCandidatesDraft?: typeof saveImportCandidatesDraft;
  onLoadImportDraftJobs?: typeof listImportDraftJobs;
  onCreateReviewPlan?: typeof createImportReviewPlan;
  onUpdateReviewItemAction?: typeof updateImportReviewItemAction;
  onLoadImportRole?: typeof getCurrentUserImportRole;
  onCommitPublicImportReviewPlan?: typeof commitPublicImportReviewPlan;
}

const baseEntityTypeMessageKeys: Record<'artist' | 'album' | 'song', MessageKey> = {
  artist: 'inbox.entity.artist',
  album: 'inbox.entity.album',
  song: 'inbox.entity.song',
};

const sourceMessageKeys: Record<ImportSource, MessageKey> = {
  musicbrainz: 'inbox.source.musicbrainz',
  discogs: 'inbox.source.discogs',
  spotify: 'inbox.source.spotify',
  anontraveler: 'inbox.source.anontraveler',
};

const reviewEntityLabels: Record<ImportEntityType, string> = {
  artist: '艺人',
  album: '专辑',
  song: '曲目',
  archive_collection: '档案集合',
  archive_item: '档案条目',
  media_asset: '媒体资产',
};

const reviewActionLabels: Record<ImportReviewPlannedAction, string> = {
  create: '创建',
  match_existing: '匹配已有',
  skip: '跳过',
  failed: '失败',
};

const reviewPlanPageSize = 25;

function formatSaveDraftError(caughtError: unknown): string {
  const message = caughtError instanceof Error ? caughtError.message : '无法保存导入草稿。';

  if (message.includes('import_jobs_source_name_check')) {
    return '需要应用数据库 migration：请应用 20260706021727_allow_anontraveler_import_source.sql，让 import_jobs.source_name 支持 anontraveler。';
  }

  return message;
}

export function InboxPage({
  candidates,
  onLoadCandidates = listImportCandidates,
  onPreviewAnontraveler = previewAnontravelerImport,
  onSaveCandidatesDraft = saveImportCandidatesDraft,
  onLoadImportDraftJobs = listImportDraftJobs,
  onCreateReviewPlan = createImportReviewPlan,
  onUpdateReviewItemAction = updateImportReviewItemAction,
  onLoadImportRole = getCurrentUserImportRole,
  onCommitPublicImportReviewPlan = commitPublicImportReviewPlan,
}: InboxPageProps) {
  const { t } = useI18n();
  const hasProvidedCandidates = Array.isArray(candidates);
  const [loadedCandidates, setLoadedCandidates] = useState<ImportCandidateSummary[]>(candidates ?? []);
  const [isLoading, setIsLoading] = useState(!hasProvidedCandidates);
  const [error, setError] = useState('');
  const [anontravelerUrl, setAnontravelerUrl] = useState('');
  const [anontravelerPreview, setAnontravelerPreview] = useState<AnontravelerPreview | null>(null);
  const [anontravelerCandidates, setAnontravelerCandidates] = useState<ImportCandidateSummary[]>([]);
  const [previewError, setPreviewError] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [savedImportJobId, setSavedImportJobId] = useState('');
  const [draftJobs, setDraftJobs] = useState<ImportDraftJobSummary[]>([]);
  const [draftJobsError, setDraftJobsError] = useState('');
  const [continuingDraftJobId, setContinuingDraftJobId] = useState('');
  const [reviewItems, setReviewItems] = useState<ImportReviewItemSummary[]>([]);
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [isGeneratingReviewPlan, setIsGeneratingReviewPlan] = useState(false);
  const [reviewActionError, setReviewActionError] = useState('');
  const [updatingReviewItemId, setUpdatingReviewItemId] = useState('');
  const [skipReasons, setSkipReasons] = useState<Record<string, string>>({});
  const [importRole, setImportRole] = useState<ImportUserRole>('anonymous');
  const [reviewPageIndex, setReviewPageIndex] = useState(0);
  const [commitMessage, setCommitMessage] = useState('');
  const [commitError, setCommitError] = useState('');
  const [isCommittingPublicImport, setIsCommittingPublicImport] = useState(false);
  const [isCandidateIndexExpanded, setIsCandidateIndexExpanded] = useState(false);

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

  useEffect(() => {
    if (importRole !== 'admin') {
      setDraftJobs([]);
      setDraftJobsError('');
      return;
    }

    let isMounted = true;

    async function loadDraftJobs() {
      setDraftJobsError('');

      try {
        const nextDraftJobs = await onLoadImportDraftJobs();
        if (isMounted) {
          setDraftJobs(nextDraftJobs);
        }
      } catch (caughtError) {
        if (isMounted) {
          setDraftJobsError(caughtError instanceof Error ? caughtError.message : 'Unable to load import draft jobs.');
        }
      }
    }

    loadDraftJobs();

    return () => {
      isMounted = false;
    };
  }, [importRole, onLoadImportDraftJobs]);

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

  const baseCandidates = hasProvidedCandidates ? candidates : loadedCandidates;
  const displayCandidates = [...anontravelerCandidates, ...baseCandidates];
  const visibleCandidateCount = isCandidateIndexExpanded ? displayCandidates.length : 0;
  const sourceCount = new Set(displayCandidates.map((candidate) => candidate.sourceName)).size;
  const previewReadyCount = anontravelerPreview ? 1 : 0;
  const reviewPageCount = Math.max(1, Math.ceil(reviewItems.length / reviewPlanPageSize));
  const currentReviewItems = reviewItems.slice(
    reviewPageIndex * reviewPlanPageSize,
    reviewPageIndex * reviewPlanPageSize + reviewPlanPageSize,
  );

  async function handleAnontravelerPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreviewError('');
    setSaveMessage('');
    setSaveError('');
    setSavedImportJobId('');
    setReviewItems([]);
    setReviewMessage('');
    setReviewError('');
    setReviewActionError('');
    setSkipReasons({});
    setReviewPageIndex(0);
    setCommitMessage('');
    setCommitError('');
    setAnontravelerPreview(null);
    setAnontravelerCandidates([]);
    setIsPreviewLoading(true);

    try {
      const preview = await onPreviewAnontraveler(anontravelerUrl.trim());
      setAnontravelerPreview(preview);
      setAnontravelerCandidates(mapAnontravelerPreviewCandidates(preview));
    } catch (caughtError) {
      setPreviewError(caughtError instanceof Error ? caughtError.message : t('inbox.anontravelerPreviewError'));
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function handleSaveAnontravelerDraft() {
    setSaveMessage('');
    setSaveError('');
    setIsSavingDraft(true);

    try {
      const result = await onSaveCandidatesDraft({
        sourceName: 'anontraveler',
        query: anontravelerUrl.trim(),
        candidates: anontravelerCandidates,
      });
      setSavedImportJobId(result.importJobId);
      setSaveMessage(`已保存 ${result.savedCount} 条候选到导入草稿。`);
      if (importRole === 'admin') {
        setDraftJobs(await onLoadImportDraftJobs());
      }
      if (!hasProvidedCandidates) {
        setLoadedCandidates(await onLoadCandidates());
      }
    } catch (caughtError) {
      setSaveError(formatSaveDraftError(caughtError));
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleGenerateReviewPlan() {
    if (!anontravelerPreview || !savedImportJobId) {
      return;
    }

    setReviewMessage('');
    setReviewError('');
    setIsGeneratingReviewPlan(true);

    try {
      const result = await onCreateReviewPlan({
        importJobId: savedImportJobId,
        sourceName: 'anontraveler',
        sourceUrl: anontravelerUrl.trim(),
        candidates: anontravelerCandidates,
        archiveCollection: {
          externalId: anontravelerPreview.collection.externalId,
          title: anontravelerPreview.collection.title,
          description: anontravelerPreview.collection.description,
          collectionType: anontravelerPreview.collection.collectionType,
        },
        archiveItems: anontravelerPreview.archiveItems,
      });
      setReviewItems(result.items);
      setReviewPageIndex(0);
      setSkipReasons(
        result.items.reduce<Record<string, string>>((nextReasons, item) => {
          nextReasons[item.id] = item.skipReason;
          return nextReasons;
        }, {}),
      );
      setReviewMessage(`确认计划已生成：${result.plannedCount} 条。`);
    } catch (caughtError) {
      setReviewError(caughtError instanceof Error ? caughtError.message : '无法生成导入确认计划。');
    } finally {
      setIsGeneratingReviewPlan(false);
    }
  }

  async function handleContinueDraft(draftJob: ImportDraftJobSummary) {
    setPreviewError('');
    setSaveError('');
    setSaveMessage('');
    setReviewItems([]);
    setReviewMessage('');
    setReviewError('');
    setReviewActionError('');
    setSkipReasons({});
    setReviewPageIndex(0);
    setCommitMessage('');
    setCommitError('');
    setAnontravelerPreview(null);
    setAnontravelerCandidates([]);
    setAnontravelerUrl(draftJob.query);
    setContinuingDraftJobId(draftJob.id);

    try {
      const preview = await onPreviewAnontraveler(draftJob.query);
      setAnontravelerPreview(preview);
      setAnontravelerCandidates(mapAnontravelerPreviewCandidates(preview));
      setSavedImportJobId(draftJob.id);
      setSaveMessage('已从保存的 URL 加载草稿。');
    } catch (caughtError) {
      setPreviewError(caughtError instanceof Error ? caughtError.message : t('inbox.anontravelerPreviewError'));
    } finally {
      setContinuingDraftJobId('');
    }
  }

  async function handleCommitPublicImport() {
    setCommitMessage('');
    setCommitError('');
    setIsCommittingPublicImport(true);

    try {
      const result = await onCommitPublicImportReviewPlan();
      setReviewItems([]);
      setSkipReasons({});
      setReviewPageIndex(0);
      setReviewActionError('');
      setSavedImportJobId('');
      setDraftJobs([]);
      setAnontravelerPreview(null);
      setAnontravelerCandidates([]);
      setAnontravelerUrl('');
      setSaveMessage('');
      setSaveError('');
      setReviewMessage('');
      setReviewError('');
      setCommitMessage(
        `公开导入已提交：创建 ${result.createdCount} 条，匹配 ${result.matchedCount} 条，跳过 ${result.skippedCount} 条。`,
      );
    } catch (caughtError) {
      setCommitError(caughtError instanceof Error ? caughtError.message : '无法提交公开导入。');
    } finally {
      setIsCommittingPublicImport(false);
    }
  }

  async function handleUpdateReviewItemAction(
    item: ImportReviewItemSummary,
    plannedAction: Extract<ImportReviewPlannedAction, 'create' | 'skip'>,
  ) {
    setReviewActionError('');
    setUpdatingReviewItemId(item.id);

    try {
      const updatedItem = await onUpdateReviewItemAction({
        reviewItemId: item.id,
        plannedAction,
        skipReason: plannedAction === 'skip' ? skipReasons[item.id] ?? item.skipReason : '',
      });
      setReviewItems((currentItems) =>
        currentItems.map((currentItem) => (currentItem.id === updatedItem.id ? updatedItem : currentItem)),
      );
      setSkipReasons((currentReasons) => ({
        ...currentReasons,
        [updatedItem.id]: updatedItem.skipReason,
      }));
    } catch (caughtError) {
      setReviewActionError(caughtError instanceof Error ? caughtError.message : 'Unable to update import review item.');
    } finally {
      setUpdatingReviewItemId('');
    }
  }

  function formatEntityType(entityType: ImportEntityType): string {
    if (entityType === 'artist' || entityType === 'album' || entityType === 'song') {
      return t(baseEntityTypeMessageKeys[entityType]);
    }

    return reviewEntityLabels[entityType];
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
            <strong>{displayCandidates.length}</strong>
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
          <button type="submit">{t('inbox.anontravelerPreviewSubmit')}</button>
        </form>
      </div>

      {isPreviewLoading ? <p>{t('inbox.anontravelerPreviewLoading')}</p> : null}
      {previewError ? <p role="alert">{previewError}</p> : null}
      {importRole === 'admin' && draftJobs.length > 0 ? (
        <section className="inbox-draft-jobs">
          <div className="inbox-panel-heading">
            <p>已保存的导入任务</p>
            <h2>已有草稿</h2>
          </div>
          <div className="inbox-draft-jobs__list">
            {draftJobs.map((draftJob) => (
              <article className="inbox-draft-job" key={draftJob.id}>
                <div>
                  <h3>{draftJob.query}</h3>
                  <p>{draftJob.candidateCount} 条候选</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleContinueDraft(draftJob)}
                  disabled={continuingDraftJobId === draftJob.id}
                  aria-label={`继续草稿 ${draftJob.id}`}
                >
                  {continuingDraftJobId === draftJob.id ? '正在加载草稿...' : '继续草稿'}
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {draftJobsError ? <p role="alert">{draftJobsError}</p> : null}
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
              {anontravelerPreview.albums.slice(0, 5).map((album, albumIndex) => (
                <article className="inbox-album-preview-card" key={album.externalId}>
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
              <button type="button" onClick={handleSaveAnontravelerDraft} disabled={isSavingDraft || anontravelerCandidates.length === 0}>
                {isSavingDraft ? '正在保存草稿...' : '保存到导入草稿'}
              </button>
              <button
                type="button"
                onClick={handleGenerateReviewPlan}
                disabled={isGeneratingReviewPlan || !savedImportJobId}
              >
                {isGeneratingReviewPlan ? '正在生成确认计划...' : '生成确认计划'}
              </button>
              {saveMessage ? <p>{saveMessage}</p> : null}
              {saveError ? <p role="alert">{saveError}</p> : null}
              {reviewMessage ? <p>{reviewMessage}</p> : null}
              {reviewError ? <p role="alert">{reviewError}</p> : null}
            </div>
          </>
        ) : (
          <p className="inbox-preview-empty">{t('inbox.previewEmpty')}</p>
        )}
      </section>

      {error ? <p className="inbox-error" role="alert">{error}</p> : null}
      {isLoading ? <p className="inbox-loading">{t('inbox.loading')}</p> : null}

      {!isLoading && displayCandidates.length === 0 ? <p className="inbox-empty">{t('inbox.empty')}</p> : null}

      {!isLoading && displayCandidates.length > 0 ? (
        <section className="inbox-candidate-index">
          <div className="inbox-candidate-index__header">
            <div className="inbox-panel-heading">
              <p>{t('inbox.pendingCandidates')}</p>
              <h2>{t('inbox.candidateIndex')}</h2>
            </div>
            <div className="inbox-candidate-index__summary">
              <p>{`共 ${displayCandidates.length} 条，当前展示 ${visibleCandidateCount} 条`}</p>
              <button
                type="button"
                aria-expanded={isCandidateIndexExpanded}
                onClick={() => setIsCandidateIndexExpanded((currentValue) => !currentValue)}
              >
                {isCandidateIndexExpanded ? '收起候选' : '展开候选'}
              </button>
            </div>
          </div>
          {isCandidateIndexExpanded ? (
            <div className="inbox-candidate-table">
              <div className="inbox-candidate-row inbox-candidate-row--header">
                <span>{t('inbox.columnCandidate')}</span>
                <span>{t('inbox.columnSource')}</span>
                <span>{t('inbox.columnType')}</span>
                <span>{t('inbox.columnSummary')}</span>
              </div>
              {displayCandidates.map((candidate) => (
                <article className="inbox-candidate-row" key={candidate.id}>
                  <div>
                    <h3>{candidate.displayTitle}</h3>
                  </div>
                  <span>{t(sourceMessageKeys[candidate.sourceName])}</span>
                  <span>{formatEntityType(candidate.entityType)}</span>
                  <p>{candidate.displaySubtitle}</p>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {commitMessage ? <p>{commitMessage}</p> : null}
      {commitError ? <p role="alert">{commitError}</p> : null}

      {reviewItems.length > 0 ? (
        <section className="inbox-review-plan">
          <div className="inbox-panel-heading">
            <p>导入前确认</p>
            <h2>确认计划</h2>
          </div>
          {reviewActionError ? <p role="alert">{reviewActionError}</p> : null}
          <div className="inbox-review-plan__toolbar">
            <p>确认计划第 {reviewPageIndex + 1} 页，共 {reviewPageCount} 页</p>
            <div>
              <button
                type="button"
                onClick={() => setReviewPageIndex((currentPage) => Math.max(0, currentPage - 1))}
                disabled={reviewPageIndex === 0}
              >
                上一页
              </button>
              <button
                type="button"
                onClick={() => setReviewPageIndex((currentPage) => Math.min(reviewPageCount - 1, currentPage + 1))}
                disabled={reviewPageIndex >= reviewPageCount - 1}
              >
                下一页
              </button>
            </div>
          </div>
          {importRole === 'admin' ? (
            <div className="inbox-review-plan__commit">
              <button type="button" onClick={handleCommitPublicImport} disabled={isCommittingPublicImport}>
                {isCommittingPublicImport ? '正在提交公开导入...' : '提交公开导入'}
              </button>
              {isCommittingPublicImport ? <p role="status">正在提交公开导入，请保持页面打开。</p> : null}
              {commitMessage ? <p>{commitMessage}</p> : null}
              {commitError ? <p role="alert">{commitError}</p> : null}
            </div>
          ) : null}
          <div className="inbox-review-plan__table">
            <div className="inbox-review-plan__row inbox-review-plan__row--header">
              <span>条目</span>
              <span>类型</span>
              <span>操作</span>
              <span>来源 ID</span>
              <span>编辑</span>
            </div>
            {currentReviewItems.map((item) => (
              <article className="inbox-review-plan__row" key={item.id}>
                <h3>{item.displayTitle}</h3>
                <span>{reviewEntityLabels[item.entityType]}</span>
                <span>{reviewActionLabels[item.plannedAction]}</span>
                <p>{item.sourceId}</p>
                <div className="inbox-review-plan__actions">
                  <label>
                    <span>跳过原因：{item.displayTitle}</span>
                    <input
                      aria-label={`跳过原因：${item.displayTitle}`}
                      value={skipReasons[item.id] ?? item.skipReason}
                      onChange={(event) =>
                        setSkipReasons((currentReasons) => ({
                          ...currentReasons,
                          [item.id]: event.target.value,
                        }))
                      }
                    />
                  </label>
                  {item.plannedAction === 'skip' && item.skipReason ? (
                    <p className="inbox-review-plan__skip-reason">{item.skipReason}</p>
                  ) : null}
                  {item.plannedAction === 'skip' ? (
                    <button
                      type="button"
                      onClick={() => handleUpdateReviewItemAction(item, 'create')}
                      disabled={updatingReviewItemId === item.id}
                    >
                      恢复 {item.displayTitle} 为创建
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUpdateReviewItemAction(item, 'skip')}
                      disabled={updatingReviewItemId === item.id}
                    >
                      跳过 {item.displayTitle}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
