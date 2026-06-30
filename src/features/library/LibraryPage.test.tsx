import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LibraryPage } from './LibraryPage';

describe('LibraryPage', () => {
  it('renders media categories', () => {
    render(<LibraryPage />);

    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Videos')).toBeInTheDocument();
    expect(screen.getByText('Scores')).toBeInTheDocument();
    expect(screen.getByText('Audio')).toBeInTheDocument();
  });
});
