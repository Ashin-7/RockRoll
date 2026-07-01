import './AppShell.css';
import { useI18n } from '../../i18n/I18nProvider';
import { MessageKey } from '../../i18n/messages';

interface AppShellProps {
  children: React.ReactNode;
  currentHash?: string;
}

const navItems: Array<{ href: string; labelKey: MessageKey }> = [
  { href: '#backstage', labelKey: 'nav.backstage' },
  { href: '#songs', labelKey: 'nav.songs' },
  { href: '#practice', labelKey: 'nav.practice' },
  { href: '#archive', labelKey: 'nav.archive' },
  { href: '#inbox', labelKey: 'nav.inbox' },
  { href: '#library', labelKey: 'nav.library' },
];

export function AppShell({ children, currentHash = window.location.hash }: AppShellProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <div className="app-shell__brand">
          <span className="app-shell__rec" aria-hidden="true" />
          <span>
            RcokRoll
            <small>{t('nav.privateRoom')}</small>
          </span>
        </div>
        <button
          className="app-shell__language"
          type="button"
          onClick={() => setLocale(locale === 'en' ? 'zh-CN' : 'en')}
        >
          {t('common.languageToggle')}
        </button>
        <nav aria-label={t('nav.primary')} className="app-shell__nav">
          {navItems.map((item) => (
            <a
              aria-current={currentHash === item.href ? 'page' : undefined}
              className={currentHash === item.href ? 'is-active' : undefined}
              href={item.href}
              key={item.href}
            >
              {t(item.labelKey)}
            </a>
          ))}
        </nav>
      </aside>
      <main className="app-shell__main">{children}</main>
    </div>
  );
}
