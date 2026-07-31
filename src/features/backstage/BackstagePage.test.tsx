import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { BackstagePage } from './BackstagePage';

describe('BackstagePage', () => {
  it('renders the local practice dashboard', () => {
    const { container } = renderWithI18n(<BackstagePage />);

    expect(container.querySelector('header.backstage-hero__copy.ui-panel--hero')).toBeInTheDocument();
    expect(container.querySelector('.backstage-hero__heading.ui-section-heading')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Your private music archive.' })).toBeInTheDocument();
    expect(screen.getByText('Your private music archive.')).toBeInTheDocument();
    expect(screen.getByLabelText('Today practice amp panel')).toBeInTheDocument();
    expect(container.querySelector('article.amp-panel.ui-panel--card')).toBeInTheDocument();
    expect(screen.getByText('Little Wing')).toBeInTheDocument();
    const signalCards = Array.from(container.querySelectorAll('.signal-grid > .ui-stat-card'));
    expect(signalCards).toHaveLength(3);
    expect(signalCards.map((card) => card.textContent)).toEqual([
      'Practice4h 20mThis week in the room',
      'Songs18Learning, polishing, archived',
      'Archive42Artists, records, genres',
    ]);
    expect(container.querySelector('.signal-card')).not.toBeInTheDocument();
    const sectionHeadings = Array.from(
      container.querySelectorAll('.backstage-columns > article > .ui-section-heading'),
    );
    const contentPanels = Array.from(
      container.querySelectorAll('.backstage-columns > article.ui-panel--card'),
    );
    expect(contentPanels).toHaveLength(2);
    expect(sectionHeadings).toHaveLength(2);
    sectionHeadings.forEach((heading) => {
      expect(heading.querySelector('p.eyebrow')).toBeInTheDocument();
      expect(heading.querySelector('h2')).toBeInTheDocument();
    });
    expect(container.querySelector('.backstage-columns .section-heading')).not.toBeInTheDocument();
    expect(screen.getByText('Practice evidence')).toBeInTheDocument();
    expect(screen.getByText('Kind of Blue')).toBeInTheDocument();
  });
});
