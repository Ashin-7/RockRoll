import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { InboxPage } from './InboxPage';
import { AnontravelerPreview } from './anontraveler.types';
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

const anontravelerPreview: AnontravelerPreview = {
  versionId: 'version-1',
  sourceUrl: 'https://www.anontraveler.com/rank/version/version-1',
  collection: {
    externalId: 'version-1',
    title: 'Classic rock guide',
    description: 'Albums to explore.',
    source: 'anontraveler',
    collectionType: 'album_rank',
  },
  artists: [{ externalId: 'artist-1', name: 'The Beatles' }],
  albums: [
    {
      externalId: 'album-1',
      title: 'Please Please Me',
      artistName: 'The Beatles',
      releaseYear: 1963,
      note: 'Beat music marker.',
    },
  ],
  archiveItems: [
    {
      externalId: 'item-1',
      albumExternalId: 'album-1',
      displayTitle: 'Please Please Me',
      position: 1,
      note: 'Beat music marker.',
    },
  ],
  skippedSongs: 0,
};

describe('InboxPage', () => {
  it('loads and renders import candidates from the provided loader', async () => {
    renderWithI18n(<InboxPage onLoadCandidates={vi.fn().mockResolvedValue(candidates)} />);

    expect(screen.getByText('Loading import candidates...')).toBeInTheDocument();
    expect(await screen.findByText('The Jimi Hendrix Experience')).toBeInTheDocument();
    expect(screen.getByText('US - American-English rock band')).toBeInTheDocument();
    expect(screen.getByText('MusicBrainz')).toBeInTheDocument();
    expect(screen.getByText('Artist')).toBeInTheDocument();
  });

  it('renders the inbox CRUD UI pattern with metrics, sections, and candidate rows', () => {
    renderWithI18n(<InboxPage candidates={candidates} />);

    expect(screen.getByText('Candidates filed')).toBeInTheDocument();
    expect(screen.getByText('Preview sources')).toBeInTheDocument();
    expect(screen.getByText('Ready preview')).toBeInTheDocument();
    expect(screen.getByText('Import workflow')).toBeInTheDocument();
    expect(screen.getByText('Source / Anontraveler')).toBeInTheDocument();
    expect(screen.getByText('Preview output')).toBeInTheDocument();
    expect(screen.getByText('Candidate index')).toBeInTheDocument();
    expect(screen.getByText('Candidate')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
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

  it('previews a public Anontraveler URL without writing import candidates', async () => {
    const user = userEvent.setup();
    const onPreviewAnontraveler = vi.fn().mockResolvedValue(anontravelerPreview);

    renderWithI18n(
      <InboxPage
        candidates={[]}
        onPreviewAnontraveler={onPreviewAnontraveler}
      />,
    );

    await user.type(
      screen.getByLabelText('Anontraveler rank version URL'),
      'https://www.anontraveler.com/rank/version/version-1',
    );
    await user.click(screen.getByRole('button', { name: 'Preview Anontraveler' }));

    expect(onPreviewAnontraveler).toHaveBeenCalledWith('https://www.anontraveler.com/rank/version/version-1');
    expect(await screen.findByText('Classic rock guide')).toBeInTheDocument();
    expect(screen.getByText('Artists to preview: 1')).toBeInTheDocument();
    expect(screen.getByText('Albums to preview: 1')).toBeInTheDocument();
    expect(screen.getByText('Archive items to preview: 1')).toBeInTheDocument();
    expect(screen.getByText('Songs skipped: 0')).toBeInTheDocument();
    expect(screen.getByText('Preview collection')).toBeInTheDocument();
    expect(screen.getByText('Album samples')).toBeInTheDocument();
    expect(screen.getByText('Please Please Me')).toBeInTheDocument();
  });
});
