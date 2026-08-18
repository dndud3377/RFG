import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { authAPI } from '../api/client'

const OIDC_STATE_JWT_KEY = 'oidc_state_jwt'

// ADFS가 form_post로 전송한 id_token을 백엔드로 전달해 로그인을 마무리한다.
export default function OIDCCallbackPage() {
  const { t } = useTranslation()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const idTokenInput = document.getElementById('id_token')
    const stateInput = document.getElementById('state')

    const token = idTokenInput?.value
    const stateVal = stateInput?.value
    const nonceJwt = localStorage.getItem(OIDC_STATE_JWT_KEY) || undefined

    if (!token) {
      setError(t('login.error_no_id_token'))
      setLoading(false)
      return
    }

    localStorage.removeItem(OIDC_STATE_JWT_KEY)

    authAPI.oidcCallback({ id_token: token, state: stateVal, nonce_jwt: nonceJwt })
      .then((res) => {
        window.location.href = res.redirect_url || '/'
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t('login.error_processing'))
        setLoading(false)
      })
  }, [t])

  if (loading) {
    return <div className="oidc-callback">{t('login.processing')}</div>
  }

  if (error) {
    return (
      <div className="oidc-callback oidc-callback--error">
        <div className="form-error">{error}</div>
        <button className="btn btn--sm" onClick={() => { window.location.href = '/' }}>
          {t('login.back_to_main')}
        </button>
      </div>
    )
  }

  return null
}
