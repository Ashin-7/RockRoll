import { getSupabase } from '../../lib/supabase';
import { ImportCandidateSummary, ImportEntityType, ImportSource } from './inbox.types';

interface ImportCandidateRow {
  id: string;
  entity_type: ImportEntityType;
  display_title: string;
  display_subtitle: string;
  source_name: ImportSource;
}

const demoImportCandidatesStorageKey = 'rockroll.demoImportCandidates';

function isMissingSupabaseEnvError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('Missing VITE_SUPABASE_');
}

function readDemoImportCandidates(): ImportCandidateSummary[] {
  const storedCandidates = window.localStorage.getItem(demoImportCandidatesStorageKey);
  return storedCandidates ? (JSON.parse(storedCandidates) as ImportCandidateSummary[]) : [];
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
