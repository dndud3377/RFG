import { NavLink, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Navbar() {
  const { t } = useTranslation()

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="brand">
          <span className="brand__mark">R</span>
          {t('app.name')}
        </Link>
        <nav className="navbar__links">
          <NavLink to="/" end>{t('nav.home')}</NavLink>
          <a href="/#tools">{t('nav.tools')}</a>
          <a href="/#help">{t('nav.help')}</a>
        </nav>
        <Link to="/tools/loan" className="navbar__cta">{t('nav.cta')}</Link>
      </div>
    </header>
  )
}
