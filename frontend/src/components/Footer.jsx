import { useTranslation } from 'react-i18next'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="footer" id="help">
      <div className="container footer__inner">
        <span className="footer__note">{t('footer.rights')}</span>
        <span className="footer__copy">{t('footer.copyright')}</span>
      </div>
    </footer>
  )
}
