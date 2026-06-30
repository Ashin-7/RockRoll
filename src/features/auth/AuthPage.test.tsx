import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { AuthPage } from './AuthPage';

describe('AuthPage', () => {
  it('submits email magic link request', async () => {
    const signIn = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithI18n(<AuthPage onSignIn={signIn} />);

    await user.type(screen.getByLabelText('Email'), 'player@example.com');
    await user.click(screen.getByRole('button', { name: 'Send magic link' }));

    expect(signIn).toHaveBeenCalledWith('player@example.com');
    expect(await screen.findByText('Check your email for the login link.')).toBeInTheDocument();
  });
});
