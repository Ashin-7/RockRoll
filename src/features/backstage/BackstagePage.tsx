import {
  archiveSignals,
  importDrafts,
  practiceFocus,
  recentTapes,
} from './backstage.mock';
import './BackstagePage.css';
import { useI18n } from '../../i18n/I18nProvider';

const ampControls = ['Volume', 'Treble', 'Middle', 'Bass', 'Reverb', 'Presence'];

function normalizeEditorialText(value: string) {
  return value.replace('鈫?', '→').replace('路', '·');
}

export function BackstagePage() {
  const { t } = useI18n();

  return (
    <section className="backstage-page">
      <header className="backstage-editorial-hero">
        <div className="backstage-editorial-hero__copy">
          <p>{t('backstage.hero.eyebrow')}</p>
          <h1>{t('backstage.hero.title')}</h1>
          <p>{t('backstage.hero.description')}</p>
        </div>

        <article className="backstage-practice-sheet" aria-label={t('backstage.amp.ariaLabel')}>
          <header className="backstage-practice-sheet__header">
            <strong>Today&apos;s practice</strong>
            <span>{practiceFocus.takeLabel}</span>
          </header>
          <div className="backstage-practice-sheet__identity">
            <strong>{practiceFocus.takeLabel.replace(/\D/g, '')}</strong>
            <div>
              <h2>{practiceFocus.songTitle}</h2>
              <p>{practiceFocus.artistName}</p>
            </div>
          </div>
          <dl className="backstage-practice-sheet__details">
            <div>
              <dt>{t('backstage.amp.focus')}</dt>
              <dd>{practiceFocus.target}</dd>
            </div>
            <div>
              <dt>{t('backstage.amp.tempo')}</dt>
              <dd>{normalizeEditorialText(practiceFocus.tempo)}</dd>
            </div>
            <div>
              <dt>{t('backstage.amp.roomTime')}</dt>
              <dd>{practiceFocus.durationMinutes} {t('backstage.amp.minutes')}</dd>
            </div>
          </dl>
          <div className="backstage-practice-sheet__amp" aria-hidden="true">
            {ampControls.map((control, index) => (
              <span key={control}>
                <small>{control}</small>
                <i style={{ '--knob-turn': `${-56 + index * 17}deg` } as React.CSSProperties} />
              </span>
            ))}
          </div>
        </article>
      </header>

      <section className="backstage-signal-ledger" aria-label={t('backstage.signals.ariaLabel')}>
        {archiveSignals.map((signal) => (
          <article key={signal.label}>
            <span>{signal.label}</span>
            <strong>{signal.value}</strong>
            <p>{signal.detail}</p>
          </article>
        ))}
      </section>

      <div className="backstage-ledgers">
        <section className="backstage-tape-ledger">
          <header>
            <p>{t('backstage.sections.recentTapes')}</p>
            <h2>{t('backstage.sections.practiceEvidence')}</h2>
          </header>
          <div className="backstage-tape-ledger__columns" aria-hidden="true">
            <span>Tape</span>
            <span>Note</span>
            <span>Last played</span>
          </div>
          {recentTapes.map((tape, index) => (
            <article className="backstage-tape-row" key={tape.title}>
              <span className="backstage-tape-row__number">#{String(7 - index).padStart(2, '0')}</span>
              <h3>{tape.title}</h3>
              <p>{tape.note}</p>
              <time>{normalizeEditorialText(tape.recordedAt)}</time>
              <a href="#practice" aria-label={`${tape.title} · ${t('nav.practice')}`}>→</a>
            </article>
          ))}
        </section>

        <section className="backstage-draft-ledger">
          <header>
            <p>{t('backstage.sections.importInbox')}</p>
            <h2>{t('backstage.sections.curate')}</h2>
          </header>
          {importDrafts.map((draft, index) => (
            <article className="backstage-draft-row" key={`${draft.source}-${draft.title}`}>
              <span className={`backstage-draft-row__mark backstage-draft-row__mark--${index + 1}`} aria-hidden="true">
                {draft.type.charAt(0)}
              </span>
              <div>
                <span>{draft.type}</span>
                <h3>{draft.title}</h3>
                <p>{draft.source}</p>
              </div>
              <a href="#inbox" aria-label={`${draft.title} · ${t('backstage.sections.importInbox')}`}>→</a>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
