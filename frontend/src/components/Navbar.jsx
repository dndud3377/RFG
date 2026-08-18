import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Navbar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isLoggedIn, isLoading, currentUser, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

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
        <div className="navbar__auth">
          {!isLoading && (
            isLoggedIn ? (
              <>
                <span className="navbar__user">{t('nav.greeting', { name: currentUser.name })}</span>
                <button className="btn btn--sm btn--ghost" onClick={handleLogout}>
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn--sm">{t('nav.login')}</Link>
            )
          )}
        </div>
      </div>
    </header>
  )
}
