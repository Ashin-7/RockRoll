import { useI18n } from '../../i18n/I18nProvider';

export function LibraryPage() {
  const { t } = useI18n();

  return (
    <section>
      <p className="eyebrow">{t('library.eyebrow')}</p>
      <h1>{t('library.title')}</h1>
      <div>
        <article>
          <h2>{t('library.videos')}</h2>
          <p>{t('library.videosDescription')}</p>
        </article>
        <article>
          <h2>{t('library.scores')}</h2>
          <p>{t('library.scoresDescription')}</p>
        </article>
        <article>
          <h2>{t('library.audio')}</h2>
          <p>{t('library.audioDescription')}</p>
        </article>
      </div>
    </section>
  );
}
