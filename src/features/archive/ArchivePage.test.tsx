import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { ArchivePage } from './ArchivePage';

describe('ArchivePage', () => {
  it('renders archive sections', () => {
    renderWithI18n(<ArchivePage />);

    expect(screen.getByText('Music Archive')).toBeInTheDocument();
    expect(screen.getByText('Artists')).toBeInTheDocument();
    expect(screen.getByText('Albums')).toBeInTheDocument();
    expect(screen.getByText('Genres')).toBeInTheDocument();
  });
});
