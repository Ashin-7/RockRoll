import { SongSummary } from './song.types';

interface SongListPageProps {
  songs: SongSummary[];
}

export function SongListPage({ songs }: SongListPageProps) {
  return (
    <section>
      <p className="eyebrow">Song-centered archive</p>
      <h1>Songs</h1>
      {songs.length === 0 ? (
        <p>No songs in the archive yet.</p>
      ) : (
        <div>
          {songs.map((song) => (
            <article key={song.id}>
              <h2>{song.title}</h2>
              <p>{song.artistName}</p>
              <p>{song.status}</p>
              {song.difficulty ? <p>Difficulty {song.difficulty}/5</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
