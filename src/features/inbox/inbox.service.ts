import { getSupabase } from '../../lib/supabase';
import { ImportCandidateSummary, ImportSource } from './inbox.types';

interface ImportCandidateRow {
  id: string;
  display_title: string;
  display_subtitle: string;
  source_name: ImportSource;
}

export async function listImportCandidates(): Promise<ImportCandidateSummary[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('import_candidates')
    .select('id,display_title,display_subtitle,source_name')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ImportCandidateRow[]).map((candidate) => ({
    id: candidate.id,
    displayTitle: candidate.display_title,
    displaySubtitle: candidate.display_subtitle,
    sourceName: candidate.source_name,
  }));
}
