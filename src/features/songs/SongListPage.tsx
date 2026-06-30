import { useI18n } from '../../i18n/I18nProvider';
import { SongSummary } from './song.types';

interface SongListPageProps {
  songs: SongSummary[];
}

export function SongListPage({ songs }: SongListPageProps) {
  const { t } = useI18n();

  return (
    <section>
      <p className="eyebrow">{t('songs.eyebrow')}</p>
      <h1>{t('songs.title')}</h1>
      {songs.length === 0 ? (
        <p>{t('songs.empty')}</p>
      ) : (
        <div>
          {songs.map((song) => (
            <article key={song.id}>
              <h2>{song.title}</h2>
              <p>{song.artistName}</p>
              <p>{song.status}</p>
              {song.difficulty ? <p>{t('songs.difficulty')} {song.difficulty}/5</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
