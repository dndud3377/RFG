// ===== JWT 토큰 관리 (dev 모드에서만 사용, sso 모드는 HttpOnly Cookie를 쓴다) =====

const TOKEN_KEY = 'access_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// ===== HTTP 기본 클라이언트 =====

const BASE_URL = '/api'
const IS_DEV_MODE = import.meta.env.VITE_AUTH_MODE === 'dev'

// 중복 리다이렉트 방지 플래그
let isRedirectingToSSO = false

// SSO 모드에서 401 발생 시 ADFS로 자동 리다이렉트 (request-site와 동일한 구조)
async function redirectToSSO() {
  if (isRedirectingToSSO) return
  isRedirectingToSSO = true
  try {
    const res = await fetch(`${BASE_URL}/auth/oidc/login/`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      if (data.nonce_jwt) localStorage.setItem('oidc_state_jwt', data.nonce_jwt)
      window.location.href = data.redirect_url
    } else {
      isRedirectingToSSO = false
    }
  } catch {
    isRedirectingToSSO = false
  }
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (IS_DEV_MODE) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (!res.ok) {
    if (
      res.status === 401 &&
      !IS_DEV_MODE &&
      !path.startsWith('/auth/oidc/') &&
      !path.startsWith('/auth/dev-login/')
    ) {
      redirectToSSO()
      return new Promise(() => {}) // 리다이렉트 완료까지 resolve 안 함
    }

    let errMsg = `HTTP ${res.status}`
    try {
      const body = await res.json()
      errMsg = body.error || body.detail || JSON.stringify(body)
    } catch {
      //
    }
    throw new Error(errMsg)
  }

  if (res.status === 204) return undefined
  return res.json()
}

function get(path) {
  return request(path)
}

function post(path, data) {
  return request(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined })
}

// ===== 인증 API (request-site와 동일한 사내 ADFS SSO) =====

export const authAPI = {
  me: () => get('/auth/me/'),
  refresh: () => post('/auth/refresh/'),
  oidcLogin: () => get('/auth/oidc/login/'),
  oidcCallback: (data) => post('/auth/oidc/callback/', data),
  oidcLogout: () => post('/auth/oidc/logout/'),
  devLogin: (username) => post('/auth/dev-login/', { username }),
}
