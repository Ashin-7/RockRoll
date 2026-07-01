import { useEffect, useState } from 'react';
import { AppShell } from './app/shell/AppShell';
import { getRouteForHash } from './app/routes';
import { ArchivePage } from './features/archive/ArchivePage';
import { AuthPage } from './features/auth/AuthPage';
import { BackstagePage } from './features/backstage/BackstagePage';
import { InboxPage } from './features/inbox/InboxPage';
import { LibraryPage } from './features/library/LibraryPage';
import { PracticeHistoryPage } from './features/practice/PracticeHistoryPage';
import { SongListPage } from './features/songs/SongListPage';

export default function App() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    function handleHashChange() {
      setHash(window.location.hash);
    }

    window.addEventListener('hashchange', handleHashChange);

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const route = getRouteForHash(hash);

  if (route === 'auth') {
    return <AuthPage />;
  }

  const page = {
    backstage: <BackstagePage />,
    songs: <SongListPage />,
    practice: <PracticeHistoryPage />,
    archive: <ArchivePage />,
    inbox: <InboxPage />,
    library: <LibraryPage />,
    auth: <AuthPage />,
  }[route];

  return <AppShell currentHash={hash}>{page}</AppShell>;
}
