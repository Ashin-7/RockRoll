import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from './test/render';
import App from './App';

describe('App', () => {
  it('updates the rendered page when hash navigation changes', async () => {
    window.location.hash = '#library';
    const user = userEvent.setup();

    renderWithI18n(<App />);

    expect(screen.getByRole('heading', { name: 'Library' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Practice' }));

    expect(screen.getByRole('heading', { name: 'Practice History' })).toBeInTheDocument();
  });
});
