import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { InboxPage } from './InboxPage';

describe('InboxPage', () => {
  it('renders import inbox copy', () => {
    renderWithI18n(<InboxPage />);

    expect(screen.getByText('Import Inbox')).toBeInTheDocument();
    expect(
      screen.getByText('Search public music sources, then curate the result before it enters your archive.'),
    ).toBeInTheDocument();
  });
});
