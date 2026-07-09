import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function ComingSoon() {
  const { t } = useTranslation()

  return (
    <div className="coming-soon">
      <div className="coming-soon__icon">🚧</div>
      <h1>{t('common.comingSoonTitle')}</h1>
      <p>{t('common.comingSoonDesc')}</p>
      <Link to="/" className="btn">{t('common.backToHome')}</Link>
    </div>
  )
}
