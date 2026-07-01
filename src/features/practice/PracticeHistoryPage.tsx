import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { listSongs } from '../songs/songs.service';
import { SongSummary } from '../songs/song.types';
import { PracticeHistoryItem } from './practice.mock';
import { createPracticeSession, listPracticeHistory } from './practice.service';
import { calculatePracticeStatistics } from './practiceStatistics';
import { PracticeSessionForm } from './PracticeSessionForm';
import { PracticeSessionInput } from './practice.types';
import './PracticeHistoryPage.css';

interface PracticeHistoryPageProps {
  onLoadSessions?: () => Promise<PracticeHistoryItem[]>;
  onLoadSongs?: () => Promise<SongSummary[]>;
  onSaveSession?: (input: PracticeSessionInput) => Promise<void>;
  sessions?: PracticeHistoryItem[];
}

export function PracticeHistoryPage({
  onLoadSessions = listPracticeHistory,
  onLoadSongs = listSongs,
  onSaveSession = createPracticeSession,
  sessions,
}: PracticeHistoryPageProps) {
  const { t } = useI18n();
  const hasProvidedSessions = Array.isArray(sessions);
  const [loadedSessions, setLoadedSessions] = useState<PracticeHistoryItem[]>(sessions ?? []);
  const [songs, setSongs] = useState<SongSummary[]>([]);
  const [isLoading, setIsLoading] = useState(!hasProvidedSessions);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const displaySessions = hasProvidedSessions ? sessions : loadedSessions;
  const statistics = calculatePracticeStatistics(displaySessions);
  const statisticItems = [
    {
      label: t('practiceStatistics.totalSessions'),
      value: statistics.totalSessions.toString(),
    },
    {
      label: t('practiceStatistics.totalMinutes'),
      value: `${statistics.totalMinutes} ${t('practiceHistory.minutes')}`,
    },
    {
      label: t('practiceStatistics.uniqueSongs'),
      value: statistics.uniqueSongs.toString(),
    },
    {
      label: t('practiceStatistics.averageMinutes'),
      value: `${statistics.averageMinutes} ${t('practiceHistory.minutes')}`,
    },
    {
      label: t('practiceStatistics.latestPractice'),
      value: statistics.latestPracticeDate ?? t('practiceStatistics.noPractice'),
    },
  ];

  useEffect(() => {
    if (hasProvidedSessions) {
      setLoadedSessions(sessions ?? []);
      setIsLoading(false);
      setError('');
      return;
    }

    let isMounted = true;

    async function loadSessions() {
      setIsLoading(true);
      setError('');

      try {
        const nextSessions = await onLoadSessions();
        if (isMounted) {
          setLoadedSessions(nextSessions);
        }
      } catch (caughtError) {
        if (isMounted) {
          setLoadedSessions([]);
          setError(caughtError instanceof Error ? caughtError.message : t('practiceHistory.loadError'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSessions();

    return () => {
      isMounted = false;
    };
  }, [hasProvidedSessions, onLoadSessions, sessions, t]);

  useEffect(() => {
    if (hasProvidedSessions) {
      setSongs([]);
      return;
    }

    let isMounted = true;

    async function loadSongOptions() {
      try {
        const nextSongs = await onLoadSongs();
        if (isMounted) {
          setSongs(nextSongs);
        }
      } catch (caughtError) {
        if (isMounted) {
          setSongs([]);
          setError(caughtError instanceof Error ? caughtError.message : t('songs.loadError'));
        }
      }
    }

    loadSongOptions();

    return () => {
      isMounted = false;
    };
  }, [hasProvidedSessions, onLoadSongs, t]);

  async function handleSaveSession(input: PracticeSessionInput) {
    setIsSaving(true);
    setError('');

    try {
      await onSaveSession(input);
      const nextSessions = await onLoadSessions();
      setLoadedSessions(nextSessions);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('practiceHistory.saveError'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="practice-history-page">
      <div className="practice-history-hero">
        <p className="eyebrow">{t('practiceHistory.eyebrow')}</p>
        <h1>{t('practiceHistory.title')}</h1>
      </div>

      {!hasProvidedSessions ? (
        <section className="practice-session-entry" aria-labelledby="practice-session-entry-title">
          <h2 id="practice-session-entry-title">{t('practiceHistory.formTitle')}</h2>
          <PracticeSessionForm onSave={handleSaveSession} songs={songs} />
          {isSaving ? <p className="practice-history-loading">{t('practiceHistory.saving')}</p> : null}
        </section>
      ) : null}

      <section className="practice-statistics" aria-labelledby="practice-statistics-title">
        <h2 id="practice-statistics-title">{t('practiceStatistics.title')}</h2>
        <dl className="practice-statistics__grid">
          {statisticItems.map((item) => (
            <div className="practice-statistics__item" key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {error ? (
        <p className="practice-history-error" role="alert">
          {error}
        </p>
      ) : null}

      {isLoading ? <p className="practice-history-loading">{t('practiceHistory.loading')}</p> : null}

      {!isLoading && displaySessions.length === 0 ? (
        <p className="practice-history-empty">{t('practiceHistory.empty')}</p>
      ) : null}

      {!isLoading && displaySessions.length > 0 ? (
        <div className="practice-history-list">
          {displaySessions.map((session) => (
            <article className="practice-history-card" key={session.id}>
              <header className="practice-history-card__header">
                <div>
                  <h2>{session.songTitle}</h2>
                  <p>{session.artistName}</p>
                </div>
                <time dateTime={session.practicedOn}>{session.practicedOn}</time>
              </header>

              <dl className="practice-history-card__meta">
                <div>
                  <dt>{t('practiceHistory.duration')}</dt>
                  <dd>
                    {session.durationMinutes} {t('practiceHistory.minutes')}
                  </dd>
                </div>
                <div>
                  <dt>{t('practiceHistory.bpm')}</dt>
                  <dd>{session.bpm === null ? t('practiceHistory.noBpm') : `${session.bpm} BPM`}</dd>
                </div>
              </dl>

              <div className="practice-history-card__body">
                <p>
                  <strong>{t('practiceHistory.focus')}</strong>
                  {session.focusArea}
                </p>
                <p>
                  <strong>{t('practiceHistory.reflection')}</strong>
                  {session.reflection}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
