import { useI18n } from '../../i18n/I18nProvider';

export function SongDetailPage() {
  const { t } = useI18n();

  return (
    <section>
      <p className="eyebrow">{t('songDetail.eyebrow')}</p>
      <h1>{t('songDetail.title')}</h1>
      <p>{t('songDetail.description')}</p>
    </section>
  );
}
