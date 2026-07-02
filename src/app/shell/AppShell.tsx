import './AppShell.css';
import { useI18n } from '../../i18n/I18nProvider';
import { MessageKey } from '../../i18n/messages';

interface AppShellProps {
  accountName?: string;
  children: React.ReactNode;
  currentHash?: string;
  isSignedIn?: boolean;
  onSignOut?: () => void | Promise<void>;
}

const navItems: Array<{ href: string; labelKey: MessageKey }> = [
  { href: '#backstage', labelKey: 'nav.backstage' },
  { href: '#songs', labelKey: 'nav.songs' },
  { href: '#artists', labelKey: 'nav.artists' },
  { href: '#practice', labelKey: 'nav.practice' },
  { href: '#archive', labelKey: 'nav.archive' },
  { href: '#inbox', labelKey: 'nav.inbox' },
  { href: '#library', labelKey: 'nav.library' },
];

export function AppShell({
  accountName,
  children,
  currentHash = window.location.hash,
  isSignedIn = false,
  onSignOut,
}: AppShellProps) {
  const { locale, setLocale, t } = useI18n();
  const displayName = accountName ?? t('auth.guest');

  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <div className="app-shell__brand">
          <span className="app-shell__rec" aria-hidden="true" />
          <span>
            RockRoll
            <small>{t('nav.privateRoom')}</small>
          </span>
        </div>
        <div className="app-shell__account" data-testid="account-menu">
          <span className="app-shell__account-name">{displayName}</span>
          <div className="app-shell__account-actions">
            {isSignedIn ? (
              <button type="button" onClick={onSignOut}>
                {t('auth.signOut')}
              </button>
            ) : (
              <a href="#auth">{t('nav.auth')}</a>
            )}
          </div>
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
