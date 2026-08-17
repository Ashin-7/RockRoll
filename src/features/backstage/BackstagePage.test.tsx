import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { BackstagePage } from './BackstagePage';

describe('BackstagePage', () => {
  it('renders the local practice dashboard', () => {
    const { container } = renderWithI18n(<BackstagePage />);

    expect(container.querySelector('header.backstage-editorial-hero')).toBeInTheDocument();
    expect(container.querySelector('article.backstage-practice-sheet')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Your private music archive.' })).toBeInTheDocument();
    expect(screen.getByText('Your private music archive.')).toBeInTheDocument();
    expect(screen.getByLabelText('Today practice amp panel')).toBeInTheDocument();
    expect(container.querySelector('.backstage-practice-sheet__amp')).toBeInTheDocument();
    expect(screen.getByText('Little Wing')).toBeInTheDocument();
    const signalCards = Array.from(container.querySelectorAll('.backstage-signal-ledger > article'));
    expect(signalCards).toHaveLength(3);
    expect(signalCards.map((card) => card.textContent)).toEqual([
      'Practice4h 20mThis week in the room',
      'Songs18Learning, polishing, archived',
      'Archive42Artists, records, genres',
    ]);
    expect(container.querySelectorAll('.backstage-tape-row')).toHaveLength(2);
    expect(container.querySelectorAll('.backstage-draft-row')).toHaveLength(2);
    expect(container.querySelector('.backstage-page .ui-panel')).not.toBeInTheDocument();
    expect(screen.getByText('Practice evidence')).toBeInTheDocument();
    expect(screen.getByText('Kind of Blue')).toBeInTheDocument();
  });
});
