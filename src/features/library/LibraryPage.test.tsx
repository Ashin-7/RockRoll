import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { LibraryPage } from './LibraryPage';

describe('LibraryPage', () => {
  it('renders media categories', () => {
    renderWithI18n(<LibraryPage />);

    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Videos')).toBeInTheDocument();
    expect(screen.getByText('Scores')).toBeInTheDocument();
    expect(screen.getByText('Audio')).toBeInTheDocument();
  });
});
