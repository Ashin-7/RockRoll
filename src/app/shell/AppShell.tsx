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
  { href: '#practice', labelKey: 'nav.practice' },
  { href: '#archive', labelKey: 'nav.archive' },
  { href: '#library', labelKey: 'nav.library' },
  { href: '#toolbox', labelKey: 'nav.toolbox' },
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
  const isLibraryRoute = currentHash === '#albums' || currentHash.startsWith('#album/');
  const isEditorial = currentHash === '#backstage' || isLibraryRoute || currentHash === '#practice';

  function isActiveNavItem(href: string) {
    if (href === '#library' && isLibraryRoute) {
      return true;
    }

    return currentHash === href;
  }

  return (
    <div className={`app-shell${isEditorial ? ' app-shell--editorial' : ''}`}>
      <header className="app-shell__header" data-layout="top">
        <a className="app-shell__brand" href="#backstage" aria-label="RockRoll">
          <svg className="app-shell__brand-mark" viewBox="0 0 24 32" aria-hidden="true">
            <path d="M10.2 1 2 17h7l-2.1 14L22 11h-8l4-10h-7.8Z" fill="currentColor" />
          </svg>
          <span>
            RockRoll
            <small>{t('nav.privateRoom')}</small>
          </span>
        </a>
        <nav aria-label={t('nav.primary')} className="app-shell__nav">
          {navItems.map((item) => {
            const isActive = isActiveNavItem(item.href);

            return (
              <a
                aria-current={isActive ? 'page' : undefined}
                className={isActive ? 'is-active' : undefined}
                href={item.href}
                key={item.href}
              >
                {t(item.labelKey)}
              </a>
            );
          })}
        </nav>
        <div className="app-shell__account" data-testid="account-menu">
          {isSignedIn ? (
            <>
              <span className="app-shell__account-name">{displayName}</span>
              <div className="app-shell__account-actions" aria-label={t('auth.signedIn')}>
              <button type="button" onClick={onSignOut}>
                {t('auth.signOut')}
              </button>
              </div>
            </>
          ) : (
            <a className="app-shell__account-name" href="#auth">{displayName}</a>
          )}
        </div>
        <button
          className="app-shell__language"
          type="button"
          onClick={() => setLocale(locale === 'en' ? 'zh-CN' : 'en')}
        >
          {t('common.languageToggle')}
        </button>
      </header>
      <main className="app-shell__main">{children}</main>
    </div>
  );
}
