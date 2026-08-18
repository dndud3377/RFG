import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { authAPI, setToken, clearToken } from '../api/client'
import { useIdleTimer } from '../hooks/useIdleTimer'

const SESSION_TIMEOUT_MS = 12 * 60 * 60 * 1000 // 12시간
const WARN_BEFORE_MS = 10 * 60 * 1000 // 만료 10분 전

const IS_DEV_MODE = import.meta.env.VITE_AUTH_MODE === 'dev'

const AuthContext = createContext(null)

const EMPTY_USER = { id: 0, username: '', name: '', department: '', email: '' }

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// request-site와 같은 사내 ADFS 계정으로 로그인한다 — 브라우저에 ADFS 세션이
// 남아 있으면 여기서도 재로그인 없이 곧바로 인증된다.
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(EMPTY_USER)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showWarning, setShowWarning] = useState(false)

  useEffect(() => {
    if (IS_DEV_MODE) {
      setIsLoading(false)
      return
    }

    // 운영 모드: /api/auth/me/ 최대 5회 재시도
    const MAX_RETRIES = 5
    let cancelled = false

    ;(async () => {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (cancelled) return
        try {
          const res = await authAPI.me()
          if (cancelled) return
          setCurrentUser(res.user)
          setIsLoggedIn(true)
          setIsLoading(false)
          return
        } catch (e) {
          // HTTP 오류(401 등)는 재시도하지 않고, 네트워크 오류만 재시도한다.
          if (e instanceof Error && e.message.startsWith('HTTP ')) break
          if (attempt < MAX_RETRIES - 1) await sleep((attempt + 1) * 1000)
        }
      }
      if (!cancelled) setIsLoading(false)
    })()

    return () => { cancelled = true }
  }, [])

  const autoLogout = useCallback(async () => {
    setShowWarning(false)
    if (!IS_DEV_MODE) {
      try { await authAPI.oidcLogout() } catch { /* noop */ }
    }
    clearToken()
    setIsLoggedIn(false)
    setCurrentUser(EMPTY_USER)
  }, [])

  const handleShowWarning = useCallback(() => setShowWarning(true), [])
  const handleActivity = useCallback(() => setShowWarning(false), [])

  const { reset: resetIdleTimer } = useIdleTimer(autoLogout, SESSION_TIMEOUT_MS, {
    onWarn: handleShowWarning,
    warnBeforeMs: WARN_BEFORE_MS,
    enabled: !IS_DEV_MODE && isLoggedIn,
    onActivity: handleActivity,
  })

  const extendSession = useCallback(async () => {
    setShowWarning(false)
    resetIdleTimer()
    try { await authAPI.refresh() } catch { /* noop */ }
  }, [resetIdleTimer])

  const loginSSO = async () => {
    const res = await authAPI.oidcLogin()
    if (res.nonce_jwt) localStorage.setItem('oidc_state_jwt', res.nonce_jwt)
    window.location.href = res.redirect_url
  }

  const loginDev = async (username) => {
    const res = await authAPI.devLogin(username)
    setToken(res.access)
    setCurrentUser(res.user)
    setIsLoggedIn(true)
  }

  const logout = () => {
    clearToken()
    setIsLoggedIn(false)
    setCurrentUser(EMPTY_USER)
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser, isLoggedIn, isLoading, showWarning,
        loginSSO, loginDev, logout, extendSession, autoLogout,
        isDevMode: IS_DEV_MODE,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
