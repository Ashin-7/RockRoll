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
  const rhythmMeasures = analysis?.rhythmMeasures ?? [];
  const recognizedMeasureCount = rhythmMeasures.filter((measure) => measure.status === 'recognized').length;
  const fallbackMeasureCount = rhythmMeasures.length - recognizedMeasureCount;
  const rhythmWarnings = new Set(
    rhythmMeasures
      .map((measure) => measure.warning)
      .filter((warning): warning is string => warning !== null),
  );
  const visibleWarnings = analysis?.warnings.filter((warning) => !rhythmWarnings.has(warning)) ?? [];

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
              {rhythmMeasures.length > 0 ? (
                <section className="toolbox-rhythm" aria-labelledby="toolbox-rhythm-title">
                  <h3 id="toolbox-rhythm-title">{t('toolbox.rhythmTitle')}</h3>
                  <ul className="toolbox-rhythm__summary" aria-label={t('toolbox.rhythmTitle')}>
                    <li>{rhythmMeasures.length} {t('toolbox.rhythmChecked')}</li>
                    <li>{recognizedMeasureCount} {t('toolbox.rhythmRecognized')}</li>
                    <li>{fallbackMeasureCount} {t('toolbox.rhythmFallback')}</li>
                  </ul>
                  <ul className="toolbox-rhythm__measures">
                    {rhythmMeasures.map((measure) => {
                      const statusLabel = measure.status === 'recognized'
                        ? t('toolbox.rhythmStatusRecognized')
                        : t('toolbox.rhythmStatusFallback');

                      return (
                        <li className={`toolbox-rhythm__measure toolbox-rhythm__measure--${measure.status}`} key={measure.measureNumber}>
                          <span>{t('toolbox.rhythmMeasure')} {measure.measureNumber} · {statusLabel}</span>
                          {measure.warning ? <small>{measure.warning}</small> : null}
                        </li>
                      );
                    })}
                  </ul>
                  {fallbackMeasureCount > 0 ? (
                    <p className="toolbox-rhythm__notice" role="note">{t('toolbox.rhythmFallbackNotice')}</p>
                  ) : null}
                </section>
              ) : null}
              {visibleWarnings.length > 0 ? (
                <ul>
                  {visibleWarnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
