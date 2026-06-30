import './AppShell.css';

interface AppShellProps {
  children: React.ReactNode;
}

const navItems = ['Backstage', 'Songs', 'Archive', 'Inbox', 'Library'];

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <div className="app-shell__brand">
          <span className="app-shell__rec" aria-hidden="true" />
          <span>RcokRoll</span>
        </div>
        <nav aria-label="Primary" className="app-shell__nav">
          {navItems.map((item) => (
            <a href={`#${item.toLowerCase()}`} key={item}>
              {item}
            </a>
          ))}
        </nav>
      </aside>
      <main className="app-shell__main">{children}</main>
    </div>
  );
}
