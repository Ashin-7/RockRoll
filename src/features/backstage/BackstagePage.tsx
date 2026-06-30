import {
  archiveSignals,
  importDrafts,
  practiceFocus,
  recentTapes,
} from './backstage.mock';
import './BackstagePage.css';

export function BackstagePage() {
  return (
    <section className="backstage-page">
      <div className="backstage-hero">
        <div className="backstage-hero__copy">
          <p className="eyebrow">Backstage Archive</p>
          <h1>Your private music archive.</h1>
          <p>
            Practice room, tape shelf, and liner notes for the songs you study.
          </p>
        </div>
        <article className="amp-panel" aria-label="Today practice amp panel">
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
              <dt>Focus</dt>
              <dd>{practiceFocus.target}</dd>
            </div>
            <div>
              <dt>Tempo</dt>
              <dd>{practiceFocus.tempo}</dd>
            </div>
            <div>
              <dt>Room time</dt>
              <dd>{practiceFocus.durationMinutes} min</dd>
            </div>
          </dl>
        </article>
      </div>

      <div className="signal-grid" aria-label="Archive signals">
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
            <p className="eyebrow">Recent tapes</p>
            <h2>Practice evidence</h2>
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
            <p className="eyebrow">Import inbox</p>
            <h2>Curate before it enters</h2>
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
