import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { ToolboxPage } from './ToolboxPage';

describe('ToolboxPage', () => {
  it('renders the browser-local PDF tab workflow shell', () => {
    renderWithI18n(<ToolboxPage />);

    expect(screen.getByRole('heading', { name: 'PDF Tab Workbench' })).toBeInTheDocument();
    expect(screen.getByText('Your score stays in this browser. Nothing is uploaded.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Guitar tab PDF/)).toHaveAttribute('accept', 'application/pdf,.pdf');
    expect(screen.getByText('MusicXML for Guitar Pro')).toBeInTheDocument();
  });
});
