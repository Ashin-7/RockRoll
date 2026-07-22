import {
  archiveSignals,
  importDrafts,
  practiceFocus,
  recentTapes,
} from './backstage.mock';
import './BackstagePage.css';
import { Panel, SectionHeading, StatCard } from '../../components/ui';
import { useI18n } from '../../i18n/I18nProvider';

export function BackstagePage() {
  const { t } = useI18n();

  return (
    <section className="backstage-page">
      <div className="backstage-hero">
        <Panel as="header" className="backstage-hero__copy" variant="hero">
          <SectionHeading
            as="h1"
            className="backstage-hero__heading"
            eyebrow={t('backstage.hero.eyebrow')}
            title={t('backstage.hero.title')}
          />
          <p>{t('backstage.hero.description')}</p>
        </Panel>
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
          <StatCard
            detail={signal.detail}
            key={signal.label}
            label={signal.label}
            value={signal.value}
          />
        ))}
      </div>

      <div className="backstage-columns">
        <article className="tape-stack">
          <SectionHeading
            className="backstage-section-heading"
            eyebrow={t('backstage.sections.recentTapes')}
            title={t('backstage.sections.practiceEvidence')}
          />
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
          <SectionHeading
            className="backstage-section-heading"
            eyebrow={t('backstage.sections.importInbox')}
            title={t('backstage.sections.curate')}
          />
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
