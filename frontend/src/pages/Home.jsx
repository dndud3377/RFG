import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { tools } from '../data/catalog.js'
import ToolCard from '../components/ToolCard.jsx'

export default function Home() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  const filteredTools = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tools
    return tools.filter((tool) => t(tool.nameKey).toLowerCase().includes(q))
  }, [query, t])

  return (
    <>
      <section className="hero">
        <div className="hero__glow" />
        <div className="hero__kicker">{t('home.hero.kicker')}</div>
        <h1 className="hero__title">
          {t('home.hero.titleLead')}
          <em>{t('home.hero.titleAccent')}</em>
          {t('home.hero.titleTail')}
        </h1>
        <p className="hero__subtitle">{t('home.hero.subtitle')}</p>
      </section>

      <div className="tools-section" id="tools">
        <div className="search-box">
          <span className="search-box__icon">🔍</span>
          <input
            className="search-box__input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('home.search.placeholder')}
          />
        </div>

        {filteredTools.length > 0 ? (
          <div className="card-grid">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        ) : (
          <p className="empty-msg">{t('home.search.empty')}</p>
        )}
      </div>
    </>
  )
}
