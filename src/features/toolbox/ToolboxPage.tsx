import { Field } from '../../components/ui';
import { useI18n } from '../../i18n/I18nProvider';
import './ToolboxPage.css';

export function ToolboxPage() {
  const { t } = useI18n();

  return (
    <section className="toolbox-page">
      <header className="toolbox-hero">
        <div>
          <p className="eyebrow">{t('toolbox.eyebrow')}</p>
          <h1>{t('toolbox.title')}</h1>
          <p className="toolbox-hero__description">{t('toolbox.description')}</p>
        </div>
        <p className="toolbox-local-badge">{t('toolbox.localOnly')}</p>
      </header>

      <ol className="toolbox-steps" aria-label={t('toolbox.title')}>
        <li>{t('toolbox.stepInput')}</li>
        <li>{t('toolbox.stepInspect')}</li>
        <li>{t('toolbox.stepExport')}</li>
      </ol>

      <div className="toolbox-workbench">
        <section className="toolbox-input-panel">
          <span className="toolbox-panel-label">PDF / TAB</span>
          <Field label={t('toolbox.inputLabel')} hint={t('toolbox.inputHint')}>
            <input accept="application/pdf,.pdf" id="toolbox-pdf-file" type="file" />
          </Field>
          <div className="toolbox-staff" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </section>

        <aside className="toolbox-output-panel">
          <span className="toolbox-panel-label">MUSICXML / GP</span>
          <h2>{t('toolbox.outputLabel')}</h2>
          <p>{t('toolbox.outputDescription')}</p>
        </aside>
      </div>
    </section>
  );
}
