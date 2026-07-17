import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { I18nProvider } from '../i18n/I18nProvider';

export function renderWithI18n(ui: ReactElement, options?: RenderOptions) {
  return render(ui, {
    wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
    ...options,
  });
}
