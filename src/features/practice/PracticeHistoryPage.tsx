import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { listSongs } from '../songs/songs.service';
import { SongSummary } from '../songs/song.types';
import { PracticeHistoryItem } from './practice.mock';
import {
  createPracticeSession,
  deletePracticeSession,
  getCurrentPracticeSession,
  listPracticeHistory,
  onPracticeAuthStateChange,
  PracticeAuthSession,
  updatePracticeSession,
} from './practice.service';
import { calculatePracticeStatistics } from './practiceStatistics';
import { PracticeSessionForm } from './PracticeSessionForm';
import { PracticeSessionInput } from './practice.types';
import './PracticeHistoryPage.css';

interface PracticeHistoryPageProps {
  onAuthStateChange?: (callback: (session: PracticeAuthSession | null) => void) => () => void;
  onGetCurrentSession?: () => Promise<PracticeAuthSession | null>;
  onDeleteSession?: (sessionId: string) => Promise<void>;
  onLoadSessions?: () => Promise<PracticeHistoryItem[]>;
  onLoadSongs?: () => Promise<SongSummary[]>;
  onSaveSession?: (input: PracticeSessionInput) => Promise<void>;
  onUpdateSession?: (sessionId: string, input: PracticeSessionInput) => Promise<void>;
  sessions?: PracticeHistoryItem[];
}

type PracticeHistorySort = 'date-desc' | 'date-asc';

export function PracticeHistoryPage({
  onAuthStateChange: subscribeToAuthState = onPracticeAuthStateChange,
  onDeleteSession = deletePracticeSession,
  onGetCurrentSession = getCurrentPracticeSession,
  onLoadSessions = listPracticeHistory,
  onLoadSongs = listSongs,
  onSaveSession = createPracticeSession,
  onUpdateSession = updatePracticeSession,
  sessions,
}: PracticeHistoryPageProps) {
  const { t } = useI18n();
  const hasProvidedSessions = Array.isArray(sessions);
  const [loadedSessions, setLoadedSessions] = useState<PracticeHistoryItem[]>(sessions ?? []);
  const [songs, setSongs] = useState<SongSummary[]>([]);
  const [session, setSession] = useState<PracticeAuthSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(!hasProvidedSessions);
  const [isLoading, setIsLoading] = useState(!hasProvidedSessions);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState('');
  const [editingSession, setEditingSession] = useState<PracticeHistoryItem | null>(null);
  const [songFilter, setSongFilter] = useState('');
  const [focusFilter, setFocusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<PracticeHistorySort>('date-desc');
  const [error, setError] = useState('');
  const displaySessions = hasProvidedSessions ? sessions : loadedSessions;
  const songFilterOptions = useMemo(() => {
    const options = new Map<string, string>();

    displaySessions.forEach((session) => {
      const value = session.songId ?? session.songTitle;

      if (!options.has(value)) {
        options.set(value, session.songTitle);
      }
    });

    return Array.from(options, ([value, label]) => ({ value, label })).sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  }, [displaySessions]);
  const visibleSessions = useMemo(() => {
    const normalizedFocusFilter = focusFilter.trim().toLowerCase();

    return displaySessions
      .filter((session) => {
        const sessionSongValue = session.songId ?? session.songTitle;
        const matchesSong = songFilter ? sessionSongValue === songFilter : true;
        const matchesFocus = normalizedFocusFilter
          ? session.focusArea.toLowerCase().includes(normalizedFocusFilter)
          : true;

        return matchesSong && matchesFocus;
      })
      .sort((left, right) => {
        const comparedDate = left.practicedOn.localeCompare(right.practicedOn);
        return sortOrder === 'date-asc' ? comparedDate : -comparedDate;
      });
  }, [displaySessions, focusFilter, songFilter, sortOrder]);
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
      setSession(null);
      setIsLoadingSession(false);
      return;
    }

    let isMounted = true;

    async function loadSession() {
      try {
        const currentSession = await onGetCurrentSession();
        if (isMounted) {
          setSession(currentSession);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : t('auth.errorFallback'));
        }
      } finally {
        if (isMounted) {
          setIsLoadingSession(false);
        }
      }
    }

    let unsubscribe: () => void = () => undefined;

    try {
      unsubscribe = subscribeToAuthState((nextSession) => {
        if (isMounted) {
          setSession(nextSession);
          setIsLoadingSession(false);
        }
      });
    } catch (caughtError) {
      if (isMounted) {
        setError(caughtError instanceof Error ? caughtError.message : t('auth.errorFallback'));
        setIsLoadingSession(false);
      }
    }

    loadSession();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [hasProvidedSessions, onGetCurrentSession, subscribeToAuthState, t]);

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
    if (hasProvidedSessions || !session) {
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
  }, [hasProvidedSessions, onLoadSongs, session, t]);

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

  async function handleUpdateSession(input: PracticeSessionInput) {
    if (!editingSession) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await onUpdateSession(editingSession.id, input);
      if (!hasProvidedSessions) {
        const nextSessions = await onLoadSessions();
        setLoadedSessions(nextSessions);
      }
      setEditingSession(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('practiceHistory.saveError'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (!window.confirm('Delete this practice session?')) {
      return;
    }

    setDeletingSessionId(sessionId);
    setError('');

    try {
      await onDeleteSession(sessionId);
      if (!hasProvidedSessions) {
        const nextSessions = await onLoadSessions();
        setLoadedSessions(nextSessions);
      }
      if (editingSession?.id === sessionId) {
        setEditingSession(null);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('practiceHistory.saveError'));
    } finally {
      setDeletingSessionId('');
    }
  }

  return (
    <section className="practice-history-page">
      <div className="practice-history-hero">
        <p className="eyebrow">{t('practiceHistory.eyebrow')}</p>
        <h1>{t('practiceHistory.title')}</h1>
      </div>

      {!hasProvidedSessions && isLoadingSession ? (
        <p className="practice-history-loading">{t('practiceHistory.authLoading')}</p>
      ) : null}

      {!hasProvidedSessions && !isLoadingSession && !session ? (
        <section className="practice-session-entry" aria-labelledby="practice-session-entry-title">
          <h2 id="practice-session-entry-title">{t('practiceHistory.formTitle')}</h2>
          <p className="practice-history-auth-required">{t('practiceHistory.signInRequired')}</p>
        </section>
      ) : null}

      {!hasProvidedSessions && !isLoadingSession && session ? (
        <section className="practice-session-entry" aria-labelledby="practice-session-entry-title">
          <h2 id="practice-session-entry-title">
            {editingSession ? t('practiceHistory.editTitle') : t('practiceHistory.formTitle')}
          </h2>
          <PracticeSessionForm
            initialValues={
              editingSession
                ? {
                    songId: editingSession.songId ?? null,
                    durationMinutes: editingSession.durationMinutes,
                    goalDurationMinutes: editingSession.goalDurationMinutes ?? null,
                    completionPercent: editingSession.completionPercent ?? null,
                    bpm: editingSession.bpm,
                    tags: editingSession.tags ?? [],
                    focusArea: editingSession.focusArea,
                    reflection: editingSession.reflection,
                  }
                : undefined
            }
            onSave={editingSession ? handleUpdateSession : handleSaveSession}
            songs={songs}
          />
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

      {!isLoading && displaySessions.length > 0 ? (
        <section className="practice-history-filters" aria-labelledby="practice-history-filters-title">
          <h2 id="practice-history-filters-title">{t('practiceHistory.filtersTitle')}</h2>
          <div className="practice-history-filters__grid">
            <label>
              <span>{t('practiceHistory.songFilterLabel')}</span>
              <select value={songFilter} onChange={(event) => setSongFilter(event.target.value)}>
                <option value="">{t('practiceHistory.allSongs')}</option>
                {songFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t('practiceHistory.focusFilterLabel')}</span>
              <input
                type="search"
                value={focusFilter}
                onChange={(event) => setFocusFilter(event.target.value)}
                placeholder={t('practiceHistory.focusFilterPlaceholder')}
              />
            </label>
            <label>
              <span>{t('practiceHistory.sortLabel')}</span>
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as PracticeHistorySort)}
              >
                <option value="date-desc">{t('practiceHistory.sortDateDesc')}</option>
                <option value="date-asc">{t('practiceHistory.sortDateAsc')}</option>
              </select>
            </label>
          </div>
        </section>
      ) : null}

      {!isLoading && displaySessions.length === 0 ? (
        <p className="practice-history-empty">{t('practiceHistory.empty')}</p>
      ) : null}

      {!isLoading && displaySessions.length > 0 && visibleSessions.length === 0 ? (
        <p className="practice-history-empty">{t('practiceHistory.noFilterResults')}</p>
      ) : null}

      {!isLoading && visibleSessions.length > 0 ? (
        <div className="practice-history-list">
          <div className="practice-history-list__header" aria-hidden="true">
            <span>{t('practice.song')}</span>
            <span>{t('practiceHistory.duration')}</span>
            <span>{t('practiceHistory.goal')}</span>
            <span>{t('practiceHistory.completion')}</span>
            <span>{t('practiceHistory.bpm')}</span>
            <span>{t('practiceHistory.focus')}</span>
            <span>{t('songs.openDetail')}</span>
          </div>
          {visibleSessions.map((session) => (
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
                  <dt>{t('practiceHistory.goal')}</dt>
                  <dd>
                    {session.goalDurationMinutes
                      ? `${session.goalDurationMinutes} ${t('practiceHistory.minutes')}`
                      : t('practiceHistory.noGoal')}
                  </dd>
                </div>
                <div>
                  <dt>{t('practiceHistory.completion')}</dt>
                  <dd>
                    {session.completionPercent !== undefined && session.completionPercent !== null
                      ? `${session.completionPercent}%`
                      : t('practiceHistory.noCompletion')}
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
                <div className="practice-history-card__tags" aria-label={t('practiceHistory.tags')}>
                  {(session.tags ?? []).length > 0 ? (
                    session.tags?.map((tag) => <span key={tag}>{tag}</span>)
                  ) : (
                    <span>{t('practiceHistory.noTags')}</span>
                  )}
                </div>
                <p>
                  <strong>{t('practiceHistory.reflection')}</strong>
                  {session.reflection}
                </p>
              </div>

              <div className="practice-history-card__actions">
                <button
                  aria-label={t('practiceHistory.editSession')}
                  onClick={() => setEditingSession(session)}
                  type="button"
                >
                  {t('songDetail.edit')}
                </button>
                <button
                  aria-label={t('practiceHistory.deleteSession')}
                  disabled={deletingSessionId === session.id}
                  onClick={() => handleDeleteSession(session.id)}
                  type="button"
                >
                  {t('songDetail.delete')}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
