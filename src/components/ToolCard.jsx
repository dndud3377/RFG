import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { categories } from '../data/catalog.js'

export default function ToolCard({ tool }) {
  const { t } = useTranslation()
  const accent = categories.find((c) => c.id === tool.category)?.accent || 'blue'

  const inner = (
    <>
      <div className="tool-card__icon">{t(tool.iconKey)}</div>
      <div className="tool-card__name">{t(tool.nameKey)}</div>
      <div className="tool-card__desc">{t(tool.descKey)}</div>
      <span className={`tool-card__badge ${tool.ready ? 'tool-card__badge--ready' : 'tool-card__badge--soon'}`}>
        {tool.ready ? t('home.badge.ready') : t('home.badge.soon')}
      </span>
    </>
  )

  if (!tool.ready) {
    return (
      <div className="tool-card tool-card--soon" data-accent={accent} aria-disabled="true">
        {inner}
      </div>
    )
  }

  return (
    <Link to={tool.path} className="tool-card" data-accent={accent}>
      {inner}
    </Link>
  )
}
