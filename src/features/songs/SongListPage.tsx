import { useI18n } from '../../i18n/I18nProvider';
import { MessageKey } from '../../i18n/messages';
import { SongSummary } from './song.types';
import { localSongBoard, SongBoardItem } from './songs.mock';
import './SongListPage.css';

interface SongListPageProps {
  songs?: SongSummary[];
}

const songStatusMessageKeys: Record<SongSummary['status'], MessageKey> = {
  planned: 'songs.status.planned',
  learning: 'songs.status.learning',
  polishing: 'songs.status.polishing',
  archived: 'songs.status.archived',
};

export function SongListPage({ songs }: SongListPageProps) {
  const { t } = useI18n();
  const displaySongs = songs ?? localSongBoard;
  const hasProvidedSongs = Array.isArray(songs);

  return (
    <section className="songs-page">
      <div className="songs-hero">
        <div>
          <p className="eyebrow">{t('songs.eyebrow')}</p>
          <h1>{t('songs.title')}</h1>
        </div>
        <div className="songs-hero__summary">
          <strong>{displaySongs.length}</strong>
          <span>{t('songs.currentRotation')}</span>
        </div>
      </div>

      {hasProvidedSongs && displaySongs.length === 0 ? (
        <p className="songs-empty">{t('songs.empty')}</p>
      ) : (
        <div className="song-board">
          {displaySongs.map((song) => (
            <article className="song-card" key={song.id}>
              <div className="song-card__header">
                <div>
                  <h2>{song.title}</h2>
                  <p className="song-card__artist">{song.artistName}</p>
                </div>
                <span className="song-card__status">{t(songStatusMessageKeys[song.status])}</span>
              </div>
              <div className="song-card__meta">
                {'style' in song ? <span>{(song as SongBoardItem).style}</span> : null}
                {'tempo' in song ? <span>{(song as SongBoardItem).tempo}</span> : null}
                {'lastPracticed' in song ? (
                  <span>
                    {t('songs.lastPracticed')}: {(song as SongBoardItem).lastPracticed}
                  </span>
                ) : null}
                {song.difficulty ? (
                  <span>
                    {t('songs.difficulty')} {song.difficulty}/5
                  </span>
                ) : null}
              </div>
              {'focus' in song ? (
                <div className="song-card__focus">
                  <span>{t('songs.currentFocus')}</span>
                  {(song as SongBoardItem).focus}
                </div>
              ) : null}
              {'nextStep' in song ? <p className="song-card__next">{(song as SongBoardItem).nextStep}</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
