import { ChangeEvent, useState } from 'react';
import { Field } from '../../components/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { createMusicXml as createMusicXmlDefault, getMusicXmlFileName as getMusicXmlFileNameDefault } from './musicxml.service';
import { readPdfSnapshot as readPdfSnapshotDefault } from './pdf.service';
import { analyzeTabScore as analyzeTabScoreDefault } from './tab-analyzer';
import type { PdfDocumentSnapshot, TabScoreAnalysis } from './toolbox.types';
import './ToolboxPage.css';

interface ToolboxPageProps {
  analyzeTabScore?: (snapshot: PdfDocumentSnapshot) => TabScoreAnalysis;
  createMusicXml?: (analysis: TabScoreAnalysis) => string;
  getMusicXmlFileName?: (pdfName: string) => string;
  readPdfSnapshot?: (file: File) => Promise<PdfDocumentSnapshot>;
}

export function ToolboxPage({
  analyzeTabScore = analyzeTabScoreDefault,
  createMusicXml = createMusicXmlDefault,
  getMusicXmlFileName = getMusicXmlFileNameDefault,
  readPdfSnapshot = readPdfSnapshotDefault,
}: ToolboxPageProps) {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<TabScoreAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const rhythmCheckedCount = analysis?.rhythmMeasures.length ?? 0;
  const rhythmReadyCount = analysis?.rhythmMeasures.filter((measure) => measure.status === 'recognized').length ?? 0;
  const rhythmFallbackCount = analysis?.rhythmMeasures.filter((measure) => measure.status === 'fallback').length ?? 0;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setAnalysis(null);
    setError(null);
  }

  async function handleAnalyze() {
    if (!file) {
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);
    setError(null);
    try {
      const snapshot = await readPdfSnapshot(file);
      setAnalysis(analyzeTabScore(snapshot));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('toolbox.analysisError'));
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleDownload() {
    if (!analysis) {
      return;
    }

    const blob = new Blob([createMusicXml(analysis)], { type: 'application/vnd.recordare.musicxml+xml' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = getMusicXmlFileName(analysis.fileName);
    link.click();
    URL.revokeObjectURL(objectUrl);
  }

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
            <input accept="application/pdf,.pdf" id="toolbox-pdf-file" type="file" onChange={handleFileChange} />
          </Field>
          <div className="toolbox-actions">
            <button disabled={!file || isAnalyzing} onClick={handleAnalyze} type="button">
              {isAnalyzing ? t('toolbox.analyzing') : t('toolbox.analyze')}
            </button>
            <button disabled={!analysis || isAnalyzing} onClick={handleDownload} type="button">
              {t('toolbox.download')}
            </button>
          </div>
          {error ? <p className="toolbox-error" role="alert">{error}</p> : null}
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
          {analysis ? (
            <div className="toolbox-analysis" aria-live="polite">
              <strong>{analysis.title}</strong>
              <p>{analysis.pageCount} {t('toolbox.pages')} · {analysis.measureNumbers.length} {t('toolbox.measures')} · {analysis.tempo ?? 120} BPM</p>
              <p>{analysis.fretPositions.length} {t('toolbox.fretPositionsLocated')}</p>
              <p>{analysis.fretEvents.length} {t('toolbox.fretEventsLocated')}</p>
              <p>{analysis.tabStaffSystems.length} {t('toolbox.tabStaffSystemsLocated')}</p>
              <ul>
                {analysis.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
              <section className="toolbox-rhythm" aria-labelledby="toolbox-rhythm-title">
                <h3 id="toolbox-rhythm-title">{t('toolbox.rhythmTitle')}</h3>
                <p className="toolbox-rhythm__summary">
                  {t(rhythmCheckedCount === 1
                    ? 'toolbox.rhythmCheckedOne'
                    : 'toolbox.rhythmChecked').replace('{count}', String(rhythmCheckedCount))}
                  {' · '}
                  {t('toolbox.rhythmReady').replace('{count}', String(rhythmReadyCount))}
                  {' · '}
                  {t('toolbox.rhythmFallback').replace('{count}', String(rhythmFallbackCount))}
                </p>
                {analysis.rhythmMeasures.length > 0 ? (
                  <ul className="toolbox-rhythm__list">
                    {analysis.rhythmMeasures.map((measure) => (
                      <li className={`toolbox-rhythm__item toolbox-rhythm__item--${measure.status}`} key={measure.measureNumber}>
                        <span>
                          {t(measure.status === 'recognized'
                            ? 'toolbox.rhythmRecognizedStatus'
                            : 'toolbox.rhythmFallbackStatus').replace('{measure}', String(measure.measureNumber))}
                        </span>
                        {measure.warning ? <small>{measure.warning}</small> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {rhythmFallbackCount > 0 ? (
                  <p className="toolbox-rhythm__notice">{t('toolbox.rhythmFallbackExportNotice')}</p>
                ) : null}
              </section>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
