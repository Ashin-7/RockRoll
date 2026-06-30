import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArchivePage } from './ArchivePage';

describe('ArchivePage', () => {
  it('renders archive sections', () => {
    render(<ArchivePage />);

    expect(screen.getByText('Music Archive')).toBeInTheDocument();
    expect(screen.getByText('Artists')).toBeInTheDocument();
    expect(screen.getByText('Albums')).toBeInTheDocument();
    expect(screen.getByText('Genres')).toBeInTheDocument();
  });
});
