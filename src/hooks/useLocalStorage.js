import { useState, useEffect } from 'react'

// localStorage 와 동기화되는 state 훅
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* 저장 실패는 조용히 무시 (예: 프라이빗 모드) */
    }
  }, [key, value])

  return [value, setValue]
}
