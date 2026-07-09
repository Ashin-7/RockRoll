import { getSupabase } from '../../lib/supabase';
import {
  CommitImportReviewPlanResult,
  ImportCandidateSummary,
  ImportDraftJobSummary,
  ImportEntityType,
  ImportReviewItemSummary,
  ImportReviewPlannedAction,
  ImportSource,
  ImportUserRole,
} from './inbox.types';

interface ImportCandidateRow {
  id: string;
  entity_type: ImportEntityType;
  display_title: string;
  display_subtitle: string;
  source_name: ImportSource;
}

interface SaveImportCandidatesDraftInput {
  sourceName: ImportSource;
  query: string;
  candidates: ImportCandidateSummary[];
}

interface SaveImportCandidatesDraftResult {
  importJobId: string;
  savedCount: number;
}

interface DeleteImportDraftJobResult {
  importJobId: string;
}

interface ImportJobRow {
  id: string;
}

interface ImportDraftJobRow {
  id: string;
  source_name: ImportSource;
  query: string;
  completed_at: string | null;
}

interface ImportCandidateJobRow {
  import_job_id: string;
}

interface ImportReviewItemRow {
  id: string;
  import_job_id?: string;
  entity_type: ImportEntityType;
  display_title: string;
  source_name: ImportSource;
  source_id: string;
  source_url?: string | null;
  planned_action: ImportReviewPlannedAction;
  target_entity_id: string | null;
  skip_reason: string;
  error_message: string | null;
  review_payload?: ImportReviewPayload;
}

interface UpdateImportReviewItemActionInput {
  reviewItemId: string;
  plannedAction: Extract<ImportReviewPlannedAction, 'create' | 'skip'>;
  skipReason: string;
}

interface CreateImportReviewPlanInput {
  importJobId: string;
  sourceName: ImportSource;
  sourceUrl: string;
  candidates: ImportCandidateSummary[];
  archiveCollection?: {
    externalId: string;
    title: string;
    description: string;
    collectionType: string;
  };
  archiveItems?: Array<{
    externalId: string;
    albumExternalId: string;
    displayTitle: string;
    position: number | null;
    note: string;
  }>;
}

interface CreateImportReviewPlanResult {
  plannedCount: number;
  plannedCounts: Record<ImportEntityType, number>;
  items: ImportReviewItemSummary[];
}

interface ImportReviewPayload {
  displaySubtitle?: string;
  collectionType?: string;
  description?: string;
  albumExternalId?: string;
  position?: number | null;
  note?: string;
  metadata?: {
    artistName?: string;
    releaseYear?: number | null;
    albumType?: string;
    note?: string;
    sourceRank?: number | null;
  };
}

interface ProfileRoleRow {
  role: ImportUserRole;
}

interface CreatedEntityRow {
  id: string;
}

interface ExternalSourceRow {
  source_id: string;
  entity_id: string;
  entity_type?: ImportEntityType;
}

interface ArchiveItemIdRow {
  id: string;
}

const demoImportCandidatesStorageKey = 'rockroll.demoImportCandidates';
const importReviewItemSelectColumns =
  'id,entity_type,display_title,source_name,source_id,planned_action,target_entity_id,skip_reason,error_message,review_payload';
const commitReviewItemSelectColumns =
  'id,import_job_id,entity_type,display_title,source_name,source_id,source_url,planned_action,target_entity_id,skip_reason,error_message,review_payload';
const reviewEntityCommitOrder: Record<ImportEntityType, number> = {
  artist: 0,
  album: 1,
  archive_collection: 2,
  archive_item: 3,
  song: 4,
  media_asset: 5,
};
const commitReviewItemPageSize = 1000;
const supabaseWriteBatchSize = 200;
const supabaseInFilterBatchSize = 200;
const supabaseBatchConcurrency = 3;
const emptyPlannedCounts: Record<ImportEntityType, number> = {
  artist: 0,
  album: 0,
  archive_collection: 0,
  archive_item: 0,
  song: 0,
  media_asset: 0,
};

function isMissingSupabaseEnvError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('Missing VITE_SUPABASE_');
}

function readDemoImportCandidates(): ImportCandidateSummary[] {
  const storedCandidates = window.localStorage.getItem(demoImportCandidatesStorageKey);
  return storedCandidates ? (JSON.parse(storedCandidates) as ImportCandidateSummary[]) : [];
}

function readSourceId(candidate: ImportCandidateSummary): string {
  return candidate.id.split(':').pop() ?? candidate.id;
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  handler: (item: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const currentItem = items[nextIndex];
        nextIndex += 1;
        await handler(currentItem);
      }
    }),
  );
}

function buildCandidateRows(input: SaveImportCandidatesDraftInput, userId: string, importJobId: string) {
  return input.candidates.map((candidate) => ({
    user_id: userId,
    import_job_id: importJobId,
    entity_type: candidate.entityType,
    display_title: candidate.displayTitle,
    display_subtitle: candidate.displaySubtitle,
    source_name: candidate.sourceName,
    source_id: readSourceId(candidate),
    source_url: input.query,
    raw_payload: {
      candidateId: candidate.id,
      sourceName: candidate.sourceName,
      metadata: candidate.metadata,
    },
  }));
}

function mapReviewItem(row: ImportReviewItemRow): ImportReviewItemSummary {
  return {
    id: row.id,
    entityType: row.entity_type,
    displayTitle: row.display_title,
    sourceName: row.source_name,
    sourceId: row.source_id,
    plannedAction: row.planned_action,
    targetEntityId: row.target_entity_id,
    skipReason: row.skip_reason,
    errorMessage: row.error_message,
  };
}

function readReviewSourceRank(row: { entity_type: ImportEntityType; review_payload?: ImportReviewPayload }): number | null {
  if (row.entity_type === 'album' && typeof row.review_payload?.metadata?.sourceRank === 'number') {
    return row.review_payload.metadata.sourceRank;
  }

  if (row.entity_type === 'archive_item' && typeof row.review_payload?.position === 'number') {
    return row.review_payload.position;
  }

  return null;
}

function compareNullableRank(leftRank: number | null, rightRank: number | null): number {
  if (typeof leftRank === 'number' && typeof rightRank === 'number') {
    return leftRank - rightRank;
  }

  if (typeof leftRank === 'number') {
    return -1;
  }

  if (typeof rightRank === 'number') {
    return 1;
  }

  return 0;
}

function sortReviewRows<T extends { entity_type: ImportEntityType; display_title: string; source_id: string; review_payload?: ImportReviewPayload }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => {
    const entityOrder = reviewEntityCommitOrder[left.entity_type] - reviewEntityCommitOrder[right.entity_type];
    if (entityOrder !== 0) {
      return entityOrder;
    }

    const rankOrder = compareNullableRank(readReviewSourceRank(left), readReviewSourceRank(right));
    if (rankOrder !== 0) {
      return rankOrder;
    }

    const titleOrder = left.display_title.localeCompare(right.display_title);
    if (titleOrder !== 0) {
      return titleOrder;
    }

    return left.source_id.localeCompare(right.source_id);
  });
}

function mapSortedReviewItems(rows: ImportReviewItemRow[]): ImportReviewItemSummary[] {
  return sortReviewRows(rows).map(mapReviewItem);
}

function normalizeAlbumType(albumType?: string): string {
  return albumType && ['album', 'ep', 'live', 'compilation'].includes(albumType) ? albumType : 'album';
}

function normalizeArtistName(name?: string | null): string {
  return (name ?? '').trim().toLowerCase();
}

async function getAuthenticatedUserId(errorMessage: string): Promise<string> {
  const supabase = getSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  const userId = userData.user?.id;
  if (!userId) {
    throw new Error(errorMessage);
  }

  return userId;
}

async function findPublicExternalEntityId(
  sourceName: ImportSource,
  sourceId: string,
  entityType: ImportEntityType,
): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('external_sources')
    .select('entity_id')
    .eq('source_name', sourceName)
    .eq('source_id', sourceId)
    .eq('entity_type', entityType)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ExternalSourceRow | null)?.entity_id ?? null;
}

async function findPublicExternalEntityIdsByType(
  items: ImportReviewItemRow[],
  entityType: ImportEntityType,
): Promise<Map<string, string>> {
  const sourceIds = Array.from(new Set(items.map((item) => item.source_id))).filter(Boolean);
  if (sourceIds.length === 0) {
    return new Map();
  }

  const sourceName = items[0]?.source_name;
  if (!sourceName) {
    return new Map();
  }

  const supabase = getSupabase();
  const rows: ExternalSourceRow[] = [];
  await runWithConcurrency(chunkArray(sourceIds, supabaseInFilterBatchSize), supabaseBatchConcurrency, async (sourceIdChunk) => {
    const { data, error } = await supabase
      .from('external_sources')
      .select('source_id,entity_id,entity_type')
      .eq('source_name', sourceName)
      .in('source_id', sourceIdChunk);

    if (error) {
      throw new Error(error.message);
    }
    rows.push(...((data ?? []) as ExternalSourceRow[]));
  });

  return new Map(
    rows
      .filter((row) => !row.entity_type || row.entity_type === entityType)
      .map((row) => [row.source_id, row.entity_id]),
  );
}

async function savePublicExternalSource(
  item: ImportReviewItemRow,
  entityType: ImportEntityType,
  entityId: string,
  userId: string,
) {
  const supabase = getSupabase();
  const { error } = await supabase.from('external_sources').insert({
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
    source_name: item.source_name,
    source_id: item.source_id,
    source_url: item.source_url ?? null,
    raw_payload: item.review_payload ?? {},
    visibility: 'public',
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function deleteImportJobs(importJobIds: string[]) {
  const uniqueImportJobIds = Array.from(new Set(importJobIds)).filter(Boolean);
  if (uniqueImportJobIds.length === 0) {
    return;
  }

  const supabase = getSupabase();
  for (const importJobIdChunk of chunkArray(uniqueImportJobIds, supabaseInFilterBatchSize)) {
    const { error } = await supabase.from('import_jobs').delete().in('id', importJobIdChunk);
    if (error) {
      throw new Error(error.message);
    }
  }
}

function buildReviewPlanRows(input: CreateImportReviewPlanInput, userId: string) {
  const candidateRows = input.candidates.map((candidate) => ({
    user_id: userId,
    import_job_id: input.importJobId,
    import_candidate_id: null,
    entity_type: candidate.entityType,
    source_name: candidate.sourceName,
    source_id: readSourceId(candidate),
    source_url: input.sourceUrl,
    display_title: candidate.displayTitle,
    planned_action: 'create' as const,
    review_payload: {
      candidateId: candidate.id,
      displaySubtitle: candidate.displaySubtitle,
      metadata: candidate.metadata,
    },
  }));

  const archiveCollectionRows = input.archiveCollection
    ? [
        {
          user_id: userId,
          import_job_id: input.importJobId,
          import_candidate_id: null,
          entity_type: 'archive_collection' as const,
          source_name: input.sourceName,
          source_id: input.archiveCollection.externalId,
          source_url: input.sourceUrl,
          display_title: input.archiveCollection.title,
          planned_action: 'create' as const,
          review_payload: {
            collectionType: input.archiveCollection.collectionType,
            description: input.archiveCollection.description,
          },
        },
      ]
    : [];

  const archiveItemRows = (input.archiveItems ?? []).map((item) => ({
    user_id: userId,
    import_job_id: input.importJobId,
    import_candidate_id: null,
    entity_type: 'archive_item' as const,
    source_name: input.sourceName,
    source_id: item.externalId,
    source_url: input.sourceUrl,
    display_title: item.displayTitle,
    planned_action: 'create' as const,
    review_payload: {
      albumExternalId: item.albumExternalId,
      note: item.note,
      position: item.position,
    },
  }));

  return [...candidateRows, ...archiveCollectionRows, ...archiveItemRows];
}

function countReviewPlanRowsByEntityType(
  rows: Array<{ entity_type: ImportEntityType }>,
): Record<ImportEntityType, number> {
  return rows.reduce<Record<ImportEntityType, number>>(
    (counts, row) => ({
      ...counts,
      [row.entity_type]: counts[row.entity_type] + 1,
    }),
    { ...emptyPlannedCounts },
  );
}

async function requireImportAdmin(permissionMessage: string): Promise<void> {
  const role = await getCurrentUserImportRole();
  if (role !== 'admin') {
    throw new Error(permissionMessage);
  }
}

export async function listImportCandidates(): Promise<ImportCandidateSummary[]> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      return readDemoImportCandidates();
    }
    throw caughtError;
  }
  await requireImportAdmin('Only admins can view import candidates.');
  const { data, error } = await supabase
    .from('import_candidates')
    .select('id,entity_type,display_title,display_subtitle,source_name')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ImportCandidateRow[]).map((candidate) => ({
    id: candidate.id,
    entityType: candidate.entity_type,
    displayTitle: candidate.display_title,
    displaySubtitle: candidate.display_subtitle,
    sourceName: candidate.source_name,
  }));
}

export async function saveImportCandidatesDraft(
  input: SaveImportCandidatesDraftInput,
): Promise<SaveImportCandidatesDraftResult> {
  const supabase = getSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  const userId = userData.user?.id;
  if (!userId) {
    throw new Error('You must sign in before saving import candidates.');
  }
  const role = await getCurrentUserImportRole();
  if (role !== 'admin') {
    throw new Error('Only admins can save import candidates.');
  }

  const { data: jobData, error: jobError } = await supabase
    .from('import_jobs')
    .insert({
      user_id: userId,
      query: input.query,
      source_name: input.sourceName,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (jobError) {
    throw new Error(jobError.message);
  }

  const importJobId = (jobData as ImportJobRow).id;
  const candidateRows = buildCandidateRows(input, userId, importJobId);
  if (candidateRows.length > 0) {
    await runWithConcurrency(chunkArray(candidateRows, supabaseWriteBatchSize), supabaseBatchConcurrency, async (candidateChunk) => {
      const { error: candidatesError } = await supabase.from('import_candidates').insert(candidateChunk);

      if (candidatesError) {
        throw new Error(candidatesError.message);
      }
    });
  }

  return {
    importJobId,
    savedCount: candidateRows.length,
  };
}

export async function deleteImportDraftJob(importJobId: string): Promise<DeleteImportDraftJobResult> {
  await getAuthenticatedUserId('You must sign in before deleting import draft jobs.');
  const role = await getCurrentUserImportRole();
  if (role !== 'admin') {
    throw new Error('Only admins can delete import draft jobs.');
  }

  await deleteImportJobs([importJobId]);

  return { importJobId };
}

export async function listImportDraftJobs(): Promise<ImportDraftJobSummary[]> {
  const supabase = getSupabase();
  await requireImportAdmin('Only admins can view import draft jobs.');
  const { data: jobData, error: jobError } = await supabase
    .from('import_jobs')
    .select('id,source_name,query,completed_at')
    .eq('source_name', 'anontraveler')
    .order('created_at', { ascending: false })
    .limit(10);

  if (jobError) {
    throw new Error(jobError.message);
  }

  const jobs = (jobData ?? []) as ImportDraftJobRow[];
  if (jobs.length === 0) {
    return [];
  }

  const jobIds = jobs.map((job) => job.id);
  const { data: candidateData, error: candidateError } = await supabase
    .from('import_candidates')
    .select('import_job_id')
    .in('import_job_id', jobIds);

  if (candidateError) {
    throw new Error(candidateError.message);
  }

  const candidateCounts = ((candidateData ?? []) as ImportCandidateJobRow[]).reduce<Record<string, number>>(
    (countsByJobId, candidate) => ({
      ...countsByJobId,
      [candidate.import_job_id]: (countsByJobId[candidate.import_job_id] ?? 0) + 1,
    }),
    {},
  );

  return jobs.map((job) => ({
    id: job.id,
    sourceName: job.source_name,
    query: job.query,
    completedAt: job.completed_at,
    candidateCount: candidateCounts[job.id] ?? 0,
  }));
}

export async function getCurrentUserImportRole(): Promise<ImportUserRole> {
  const supabase = getSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  const userId = userData.user?.id;
  if (!userId) {
    return 'anonymous';
  }

  const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).single();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ProfileRoleRow).role === 'admin' ? 'admin' : 'user';
}

export async function listImportReviewItems(): Promise<ImportReviewItemSummary[]> {
  const supabase = getSupabase();
  await requireImportAdmin('Only admins can view import review items.');
  const { data, error } = await supabase
    .from('import_review_items')
    .select(importReviewItemSelectColumns);

  if (error) {
    throw new Error(error.message);
  }

  return mapSortedReviewItems((data ?? []) as ImportReviewItemRow[]);
}

export async function createImportReviewPlan(
  input: CreateImportReviewPlanInput,
): Promise<CreateImportReviewPlanResult> {
  const supabase = getSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  const userId = userData.user?.id;
  if (!userId) {
    throw new Error('You must sign in before generating an import review plan.');
  }
  const role = await getCurrentUserImportRole();
  if (role !== 'admin') {
    throw new Error('Only admins can generate import review plans.');
  }

  const reviewRows = buildReviewPlanRows(input, userId);
  if (reviewRows.length === 0) {
    return {
      plannedCount: 0,
      plannedCounts: { ...emptyPlannedCounts },
      items: [],
    };
  }

  await runWithConcurrency(chunkArray(reviewRows, supabaseWriteBatchSize), supabaseBatchConcurrency, async (reviewChunk) => {
    const { error } = await supabase
      .from('import_review_items')
      .upsert(reviewChunk, { onConflict: 'user_id,source_name,source_id,entity_type' });

    if (error) {
      throw new Error(error.message);
    }
  });

  return {
    plannedCount: reviewRows.length,
    plannedCounts: countReviewPlanRowsByEntityType(reviewRows),
    items: [],
  };
}

async function insertPublicEntity(tableName: string, values: Record<string, unknown>): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from(tableName).insert(values).select('id').single();

  if (error) {
    throw new Error(error.message);
  }

  return (data as CreatedEntityRow).id;
}

async function updatePublicArchiveItemNote(archiveItemId: string, note: string) {
  const trimmedNote = note.trim();
  if (!trimmedNote) {
    return;
  }

  const supabase = getSupabase();
  const { error } = await supabase.from('archive_items').update({ note: trimmedNote }).eq('id', archiveItemId);
  if (error) {
    throw new Error(error.message);
  }
}

async function findPublicArchiveItemIdByCollectionAlbum(
  collectionId: string,
  albumId: string,
): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('archive_items')
    .select('id')
    .eq('collection_id', collectionId)
    .eq('entity_type', 'album')
    .eq('entity_id', albumId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ArchiveItemIdRow | null)?.id ?? null;
}

async function listAllCommitReviewItems(): Promise<ImportReviewItemRow[]> {
  const supabase = getSupabase();
  const rows: ImportReviewItemRow[] = [];
  let pageIndex = 0;

  while (true) {
    const from = pageIndex * commitReviewItemPageSize;
    const to = from + commitReviewItemPageSize - 1;
    const query = supabase.from('import_review_items').select(commitReviewItemSelectColumns);
    const { data, error } = await ('range' in query ? query.range(from, to) : query);

    if (error) {
      throw new Error(error.message);
    }

    const pageRows = (data ?? []) as ImportReviewItemRow[];
    rows.push(...pageRows);
    if (pageRows.length < commitReviewItemPageSize) {
      return rows;
    }
    pageIndex += 1;
  }
}

export async function commitPublicImportReviewPlan(): Promise<CommitImportReviewPlanResult> {
  const userId = await getAuthenticatedUserId('You must sign in before committing public imports.');
  const role = await getCurrentUserImportRole();
  if (role !== 'admin') {
    throw new Error('Only admins can commit public imports.');
  }

  const items = sortReviewRows(await listAllCommitReviewItems());
  const importJobIds = items.map((item) => item.import_job_id ?? '');
  const artistIdsBySourceId = new Map<string, string>();
  const artistIdsByName = new Map<string, string>();
  const albumIdsBySourceId = new Map<string, string>();
  let archiveCollectionId = '';
  let createdCount = 0;
  let matchedCount = 0;
  let skippedCount = 0;

  const skippedItems = items.filter((item) => item.planned_action === 'skip');
  skippedCount = skippedItems.length;

  const matchExistingItems = items.filter((item) => item.planned_action === 'match_existing' && item.target_entity_id);
  await Promise.all(
    matchExistingItems.map(async (item) => {
      const targetEntityId = item.target_entity_id as string;
      if (item.entity_type === 'artist') {
        artistIdsBySourceId.set(item.source_id, targetEntityId);
        artistIdsByName.set(normalizeArtistName(item.display_title), targetEntityId);
      }
      if (item.entity_type === 'album') {
        albumIdsBySourceId.set(item.source_id, targetEntityId);
      }
      await savePublicExternalSource(item, item.entity_type, targetEntityId, userId);
    }),
  );
  matchedCount += matchExistingItems.length;

  const creatableItems = items.filter((item) => item.planned_action === 'create');
  const artistItems = creatableItems.filter((item) => item.entity_type === 'artist');
  const artistItemsBySourceId = new Map(artistItems.map((item) => [item.source_id, item]));
  const albumItems = creatableItems.filter((item) => item.entity_type === 'album');
  const archiveCollectionItems = creatableItems.filter((item) => item.entity_type === 'archive_collection');
  const archiveItems = creatableItems.filter((item) => item.entity_type === 'archive_item');

  const existingArtistIds = await findPublicExternalEntityIdsByType(artistItems, 'artist');
  for (const [sourceId, entityId] of existingArtistIds) {
    artistIdsBySourceId.set(sourceId, entityId);
    const artistItem = artistItemsBySourceId.get(sourceId);
    if (artistItem) {
      artistIdsByName.set(normalizeArtistName(artistItem.display_title), entityId);
    }
  }
  matchedCount += existingArtistIds.size;

  await Promise.all(
    artistItems
      .filter((item) => !artistIdsBySourceId.has(item.source_id))
      .map(async (item) => {
        const entityId = await insertPublicEntity('artists', {
          user_id: userId,
          name: item.display_title,
          notes: '',
          visibility: 'public',
        });
        artistIdsBySourceId.set(item.source_id, entityId);
        artistIdsByName.set(normalizeArtistName(item.display_title), entityId);
        await savePublicExternalSource(item, 'artist', entityId, userId);
        createdCount += 1;
      }),
  );

  const existingAlbumIds = await findPublicExternalEntityIdsByType(albumItems, 'album');
  for (const [sourceId, entityId] of existingAlbumIds) {
    albumIdsBySourceId.set(sourceId, entityId);
  }
  matchedCount += existingAlbumIds.size;

  await Promise.all(
    albumItems
      .filter((item) => !albumIdsBySourceId.has(item.source_id))
      .map(async (item) => {
        const payload = item.review_payload ?? {};
        const artistId = artistIdsByName.get(normalizeArtistName(payload.metadata?.artistName)) ?? null;
        const entityId = await insertPublicEntity('albums', {
          user_id: userId,
          artist_id: artistId,
          title: item.display_title,
          release_year: payload.metadata?.releaseYear ?? null,
          album_type: normalizeAlbumType(payload.metadata?.albumType),
          notes: payload.metadata?.note ?? '',
          visibility: 'public',
        });
        albumIdsBySourceId.set(item.source_id, entityId);
        await savePublicExternalSource(item, 'album', entityId, userId);
        createdCount += 1;
      }),
  );

  const existingArchiveCollectionIds = await findPublicExternalEntityIdsByType(
    archiveCollectionItems,
    'archive_collection',
  );
  const existingArchiveCollectionId = Array.from(existingArchiveCollectionIds.values())[0];
  if (existingArchiveCollectionId) {
    archiveCollectionId = existingArchiveCollectionId;
    matchedCount += 1;
  } else if (archiveCollectionItems.length > 0) {
    const item = archiveCollectionItems[0];
    const payload = item.review_payload ?? {};
    archiveCollectionId = await insertPublicEntity('archive_collections', {
      user_id: userId,
      title: item.display_title,
      source: item.source_name,
      source_url: item.source_url ?? '',
      description: payload.description ?? '',
      collection_type: payload.collectionType ?? 'album_rank',
      visibility: 'public',
    });
    await savePublicExternalSource(item, 'archive_collection', archiveCollectionId, userId);
    createdCount += 1;
  }

  const existingArchiveItemIds = await findPublicExternalEntityIdsByType(archiveItems, 'archive_item');
  matchedCount += existingArchiveItemIds.size;

  await Promise.all(
    archiveItems
      .filter((item) => existingArchiveItemIds.has(item.source_id))
      .map(async (item) => {
        const payload = item.review_payload ?? {};
        const archiveItemId = existingArchiveItemIds.get(item.source_id);
        if (archiveItemId && payload.note) {
          await updatePublicArchiveItemNote(archiveItemId, payload.note);
        }
      }),
  );

  await Promise.all(
    archiveItems
      .filter((item) => !existingArchiveItemIds.has(item.source_id))
      .map(async (item) => {
        const payload = item.review_payload ?? {};
        const albumId = payload.albumExternalId ? albumIdsBySourceId.get(payload.albumExternalId) : undefined;
        if (!archiveCollectionId || !albumId) {
          throw new Error('Cannot commit archive item before its collection and album are available.');
        }
        const existingArchiveItemId = await findPublicArchiveItemIdByCollectionAlbum(archiveCollectionId, albumId);
        if (existingArchiveItemId) {
          if (payload.note) {
            await updatePublicArchiveItemNote(existingArchiveItemId, payload.note);
          }
          await savePublicExternalSource(item, 'archive_item', existingArchiveItemId, userId);
          matchedCount += 1;
          return;
        }
        const entityId = await insertPublicEntity('archive_items', {
          user_id: userId,
          collection_id: archiveCollectionId,
          entity_type: 'album',
          entity_id: albumId,
          display_title: item.display_title,
          position: payload.position ?? null,
          note: payload.note ?? '',
          external_source: item.source_name,
          external_id: item.source_id,
          visibility: 'public',
        });
        await savePublicExternalSource(item, 'archive_item', entityId, userId);
        createdCount += 1;
      }),
  );

  await deleteImportJobs(importJobIds);

  return { createdCount, matchedCount, skippedCount };
}

export async function updateImportReviewItemAction(
  input: UpdateImportReviewItemActionInput,
): Promise<ImportReviewItemSummary> {
  const supabase = getSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!userData.user?.id) {
    throw new Error('You must sign in before updating an import review item.');
  }
  const role = await getCurrentUserImportRole();
  if (role !== 'admin') {
    throw new Error('Only admins can update import review items.');
  }

  const { data, error } = await supabase
    .from('import_review_items')
    .update({
      planned_action: input.plannedAction,
      skip_reason: input.plannedAction === 'skip' ? input.skipReason.trim() : '',
      target_entity_id: null,
      error_message: null,
    })
    .select(importReviewItemSelectColumns)
    .eq('id', input.reviewItemId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapReviewItem(data as ImportReviewItemRow);
}
