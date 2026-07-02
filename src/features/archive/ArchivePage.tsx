import { useI18n } from '../../i18n/I18nProvider';

export function ArchivePage() {
  const { t } = useI18n();

  return (
    <section>
      <p className="eyebrow">{t('archive.eyebrow')}</p>
      <h1>{t('archive.title')}</h1>
      <div>
        <article>
          <h2>{t('archive.artists')}</h2>
          <p>{t('archive.artistsDescription')}</p>
        </article>
        <article>
          <h2>
            <a href="#albums">{t('archive.albums')}</a>
          </h2>
          <p>{t('archive.albumsDescription')}</p>
        </article>
        <article>
          <h2>{t('archive.genres')}</h2>
          <p>{t('archive.genresDescription')}</p>
        </article>
      </div>
    </section>
  );
}
