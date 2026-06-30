import {
  archiveSignals,
  importDrafts,
  practiceFocus,
  recentTapes,
} from './backstage.mock';
import './BackstagePage.css';
import { useI18n } from '../../i18n/I18nProvider';

export function BackstagePage() {
  const { t } = useI18n();

  return (
    <section className="backstage-page">
      <div className="backstage-hero">
        <div className="backstage-hero__copy">
          <p className="eyebrow">{t('backstage.hero.eyebrow')}</p>
          <h1>{t('backstage.hero.title')}</h1>
          <p>{t('backstage.hero.description')}</p>
        </div>
        <article className="amp-panel" aria-label={t('backstage.amp.ariaLabel')}>
          <div className="amp-panel__topline">
            <span className="rec-light" aria-hidden="true" />
            <span>{practiceFocus.takeLabel}</span>
          </div>
          <h2>{practiceFocus.songTitle}</h2>
          <p>{practiceFocus.artistName}</p>
          <div className="amp-panel__meter">
            <span />
          </div>
          <dl className="amp-panel__details">
            <div>
              <dt>{t('backstage.amp.focus')}</dt>
              <dd>{practiceFocus.target}</dd>
            </div>
            <div>
              <dt>{t('backstage.amp.tempo')}</dt>
              <dd>{practiceFocus.tempo}</dd>
            </div>
            <div>
              <dt>{t('backstage.amp.roomTime')}</dt>
              <dd>
                {practiceFocus.durationMinutes} {t('backstage.amp.minutes')}
              </dd>
            </div>
          </dl>
        </article>
      </div>

      <div className="signal-grid" aria-label={t('backstage.signals.ariaLabel')}>
        {archiveSignals.map((signal) => (
          <article className="signal-card" key={signal.label}>
            <p>{signal.label}</p>
            <strong>{signal.value}</strong>
            <span>{signal.detail}</span>
          </article>
        ))}
      </div>

      <div className="backstage-columns">
        <article className="tape-stack">
          <div className="section-heading">
            <p className="eyebrow">{t('backstage.sections.recentTapes')}</p>
            <h2>{t('backstage.sections.practiceEvidence')}</h2>
          </div>
          {recentTapes.map((tape) => (
            <div className="tape-card" key={tape.title}>
              <div>
                <h3>{tape.title}</h3>
                <p>{tape.note}</p>
              </div>
              <span>{tape.recordedAt}</span>
            </div>
          ))}
        </article>

        <article className="inbox-board">
          <div className="section-heading">
            <p className="eyebrow">{t('backstage.sections.importInbox')}</p>
            <h2>{t('backstage.sections.curate')}</h2>
          </div>
          {importDrafts.map((draft) => (
            <div className="draft-card" key={`${draft.source}-${draft.title}`}>
              <span>{draft.type}</span>
              <strong>{draft.title}</strong>
              <p>{draft.source}</p>
            </div>
          ))}
        </article>
      </div>
    </section>
  );
}
