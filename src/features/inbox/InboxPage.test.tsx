import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { InboxPage } from './InboxPage';
import { ImportCandidateSummary } from './inbox.types';

const candidates: ImportCandidateSummary[] = [
  {
    id: 'candidate-1',
    entityType: 'artist',
    displayTitle: 'The Jimi Hendrix Experience',
    displaySubtitle: 'US - American-English rock band',
    sourceName: 'musicbrainz',
  },
];

describe('InboxPage', () => {
  it('loads and renders import candidates from the provided loader', async () => {
    renderWithI18n(<InboxPage onLoadCandidates={vi.fn().mockResolvedValue(candidates)} />);

    expect(screen.getByText('Loading import candidates...')).toBeInTheDocument();
    expect(await screen.findByText('The Jimi Hendrix Experience')).toBeInTheDocument();
    expect(screen.getByText('US - American-English rock band')).toBeInTheDocument();
    expect(screen.getByText('MusicBrainz')).toBeInTheDocument();
    expect(screen.getByText('Artist')).toBeInTheDocument();
  });

  it('renders empty state when no candidates exist', async () => {
    renderWithI18n(<InboxPage onLoadCandidates={vi.fn().mockResolvedValue([])} />);

    expect(await screen.findByText('No import candidates waiting yet.')).toBeInTheDocument();
  });

  it('renders an error state when candidates cannot load', async () => {
    renderWithI18n(<InboxPage onLoadCandidates={vi.fn().mockRejectedValue(new Error('network failed'))} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('network failed');
  });

  it('renders Chinese inbox messages', () => {
    window.localStorage.setItem('rockroll.locale', 'zh-CN');

    renderWithI18n(<InboxPage candidates={[]} />);

    expect(screen.getByText('导入收件箱')).toBeInTheDocument();
    expect(screen.getByText('还没有待确认的导入候选。')).toBeInTheDocument();
  });
});
