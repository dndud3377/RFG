import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { loginSSO, loginDev, isDevMode } = useAuth()

  const [loading, setLoading] = useState(false)
  const [devLoginId, setDevLoginId] = useState('')
  const [error, setError] = useState(null)

  const handleSSO = async () => {
    setLoading(true)
    setError(null)
    try {
      await loginSSO()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('login.error_sso'))
      setLoading(false)
    }
  }

  const handleDevLogin = async (e) => {
    e.preventDefault()
    if (!devLoginId.trim()) return
    setLoading(true)
    setError(null)
    try {
      await loginDev(devLoginId.trim())
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('login.error_sso'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__logo">
          <span className="brand__mark">R</span>
          {t('app.name')}
        </div>
        <h1 className="login-card__title">{t('login.title')}</h1>
        <p className="login-card__subtitle">{t('login.subtitle')}</p>

        {error && <div className="form-error login-card__error">{error}</div>}

        {isDevMode ? (
          <form className="login-card__form" onSubmit={handleDevLogin}>
            <input
              className="input"
              type="text"
              value={devLoginId}
              onChange={(e) => setDevLoginId(e.target.value)}
              placeholder={t('login.dev_placeholder')}
              disabled={loading}
            />
            <button className="btn" type="submit" disabled={loading || !devLoginId.trim()}>
              {loading ? t('login.logging_in') : t('login.dev_btn')}
            </button>
          </form>
        ) : (
          <button className="btn" onClick={handleSSO} disabled={loading}>
            {loading ? t('login.logging_in') : t('login.btn')}
          </button>
        )}

        <p className="login-card__hint">{t('login.hint')}</p>
      </div>
    </div>
  )
}
