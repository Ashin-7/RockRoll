import { useI18n } from '../../i18n/I18nProvider';
import { localPracticeHistory, PracticeHistoryItem } from './practice.mock';
import { calculatePracticeStatistics } from './practiceStatistics';
import './PracticeHistoryPage.css';

interface PracticeHistoryPageProps {
  sessions?: PracticeHistoryItem[];
}

export function PracticeHistoryPage({ sessions = localPracticeHistory }: PracticeHistoryPageProps) {
  const { t } = useI18n();
  const statistics = calculatePracticeStatistics(sessions);
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


  return (
    <section className="practice-history-page">
      <div className="practice-history-hero">
        <p className="eyebrow">{t('practiceHistory.eyebrow')}</p>
        <h1>{t('practiceHistory.title')}</h1>
      </div>

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

      {sessions.length === 0 ? (
        <p className="practice-history-empty">{t('practiceHistory.empty')}</p>
      ) : (
        <div className="practice-history-list">
          {sessions.map((session) => (
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
      )}
    </section>
  );
}
