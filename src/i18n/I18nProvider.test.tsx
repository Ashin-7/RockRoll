import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { I18nProvider, useI18n } from './I18nProvider';

function LanguageProbe() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div>
      <p>{locale}</p>
      <h1>{t('backstage.hero.title')}</h1>
      <button type="button" onClick={() => setLocale(locale === 'en' ? 'zh-CN' : 'en')}>
        {t('common.languageToggle')}
      </button>
    </div>
  );
}

describe('I18nProvider', () => {
  it('switches between English and Chinese messages', async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <LanguageProbe />
      </I18nProvider>,
    );

    expect(screen.getByText('en')).toBeInTheDocument();
    expect(screen.getByText('Your private music archive.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '中文' }));

    expect(screen.getByText('zh-CN')).toBeInTheDocument();
    expect(screen.getByText('你的私人音乐档案馆。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
  });
});
