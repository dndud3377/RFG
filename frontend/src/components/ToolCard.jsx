import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function ToolCard({ tool }) {
  const { t } = useTranslation()

  const inner = (
    <>
      <div className="tool-card__icon">{t(tool.iconKey)}</div>
      <div className="tool-card__body">
        <div className="tool-card__name">{t(tool.nameKey)}</div>
        <div className="tool-card__desc">{t(tool.descKey)}</div>
      </div>
      <span className={`tool-card__badge ${tool.ready ? 'tool-card__badge--ready' : 'tool-card__badge--soon'}`}>
        {tool.ready ? t('home.badge.ready') : t('home.badge.soon')}
      </span>
    </>
  )

  if (!tool.ready) {
    return (
      <div className="tool-card tool-card--soon" aria-disabled="true">
        {inner}
      </div>
    )
  }

  return (
    <Link to={tool.path} className="tool-card">
      {inner}
    </Link>
  )
}
