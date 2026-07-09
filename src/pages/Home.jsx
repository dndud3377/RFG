import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { categories, tools, toolsByCategory } from '../data/catalog.js'
import ToolCard from '../components/ToolCard.jsx'

export default function Home() {
  const { t } = useTranslation()
  const [active, setActive] = useState('all')

  const visibleCategories =
    active === 'all' ? categories : categories.filter((c) => c.id === active)

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

      <div className="portal" id="tools">
        <aside className="sidebar">
          <div className="sidebar__title">{t('home.sidebar.title')}</div>

          <button
            className={`sidebar__item ${active === 'all' ? 'active' : ''}`}
            data-accent="blue"
            onClick={() => setActive('all')}
          >
            <span className="sidebar__dot" />
            {t('home.sidebar.all')}
            <span className="sidebar__count">{tools.length}</span>
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`sidebar__item ${active === cat.id ? 'active' : ''}`}
              data-accent={cat.accent}
              onClick={() => setActive(cat.id)}
            >
              <span className="sidebar__dot" />
              {t(cat.nameKey)}
              <span className="sidebar__count">{toolsByCategory(cat.id).length}</span>
            </button>
          ))}
        </aside>

        <div className="groups">
          {visibleCategories.map((cat) => (
            <section key={cat.id} data-accent={cat.accent}>
              <div className="group__head">
                <span className="group__bar" />
                <h2 className="group__name">{t(cat.nameKey)}</h2>
                <span className="group__tag">{t(cat.tagKey)}</span>
              </div>
              <div className="card-grid">
                {toolsByCategory(cat.id).map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
