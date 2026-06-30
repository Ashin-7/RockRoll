import { AppShell } from './app/shell/AppShell';
import { getRouteForHash } from './app/routes';
import { ArchivePage } from './features/archive/ArchivePage';
import { AuthPage } from './features/auth/AuthPage';
import { BackstagePage } from './features/backstage/BackstagePage';
import { InboxPage } from './features/inbox/InboxPage';
import { LibraryPage } from './features/library/LibraryPage';
import { SongListPage } from './features/songs/SongListPage';

export default function App() {
  const route = getRouteForHash(window.location.hash);

  if (route === 'auth') {
    return <AuthPage />;
  }

  const page = {
    backstage: <BackstagePage />,
    songs: <SongListPage songs={[]} />,
    archive: <ArchivePage />,
    inbox: <InboxPage />,
    library: <LibraryPage />,
    auth: <AuthPage />,
  }[route];

  return <AppShell>{page}</AppShell>;
}
