import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function EbeamReview() {
  const { t } = useTranslation()

  return (
    <div className="tool-page">
      <Link to="/" className="tool-back">{t('common.backToHome')}</Link>
      <div className="tool-header">
        <h1>{t('tools.ebeam.name')}</h1>
        <p>{t('tools.ebeam.desc')}</p>
      </div>
      <div className="panel">
        <p className="empty-msg">{t('tools.ebeam.placeholder')}</p>
      </div>
    </div>
  )
}
