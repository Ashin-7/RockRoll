import { useEffect, useState } from 'react';
import { AppShell } from './app/shell/AppShell';
import { getAlbumIdForHash, getArchiveIdForHash, getArtistIdForHash, getRouteForHash, getSongIdForHash } from './app/routes';
import { ArchiveDetailPage } from './features/archive/ArchiveDetailPage';
import { ArchivePage } from './features/archive/ArchivePage';
import { AlbumDetailPage } from './features/albums/AlbumDetailPage';
import { AlbumListPage } from './features/albums/AlbumListPage';
import { ArtistDetailPage } from './features/artists/ArtistDetailPage';
import { AuthPage } from './features/auth/AuthPage';
import { AuthSession, getCurrentSession, onAuthStateChange, signOut } from './features/auth/auth.service';
import { BackstagePage } from './features/backstage/BackstagePage';
import { InboxDisabledPage } from './features/inbox/InboxDisabledPage';
import { LibraryPage } from './features/library/LibraryPage';
import { PracticeHistoryPage } from './features/practice/PracticeHistoryPage';
import { SongDetailPage } from './features/songs/SongDetailPage';
import { SongListPage } from './features/songs/SongListPage';
import { ToolboxPage } from './features/toolbox/ToolboxPage';

export default function App() {
  const [hash, setHash] = useState(window.location.hash);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    function handleHashChange() {
      setHash(window.location.hash);
      window.scrollTo({ left: 0, top: 0 });
    }

    window.addEventListener('hashchange', handleHashChange);

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: () => void = () => undefined;

    try {
      unsubscribe = onAuthStateChange((nextSession) => {
        if (isMounted) {
          setAuthSession(nextSession);
        }
      });
    } catch {
      setAuthSession(null);
    }

    async function loadSession() {
      try {
        const currentSession = await getCurrentSession();
        if (isMounted) {
          setAuthSession(currentSession);
        }
      } catch {
        if (isMounted) {
          setAuthSession(null);
        }
      }
    }

    loadSession();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      setAuthSession(null);
    }
  }

  const route = getRouteForHash(hash);

  const page = {
    backstage: <BackstagePage />,
    songs: <SongListPage />,
    songDetail: <SongDetailPage songId={getSongIdForHash(hash)} />,
    albums: <AlbumListPage />,
    albumDetail: <AlbumDetailPage albumId={getAlbumIdForHash(hash)} />,
    artistDetail: <ArtistDetailPage artistId={getArtistIdForHash(hash)} />,
    practice: <PracticeHistoryPage />,
    archive: <ArchivePage />,
    archiveDetail: <ArchiveDetailPage archiveId={getArchiveIdForHash(hash)} />,
    inbox: <InboxDisabledPage />,
    library: <LibraryPage />,
    auth: <AuthPage />,
    toolbox: <ToolboxPage />,
  }[route];

  return (
    <AppShell
      accountName={authSession?.user.email ?? undefined}
      currentHash={hash}
      isSignedIn={Boolean(authSession)}
      onSignOut={handleSignOut}
    >
      {page}
    </AppShell>
  );
}
