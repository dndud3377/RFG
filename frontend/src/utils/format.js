// 숫자 포맷 유틸

const wonFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 })

// 원화 정수 포맷 (예: 1234567 -> "1,234,567")
export function formatWon(value) {
  if (value == null || Number.isNaN(value)) return '0'
  return wonFormatter.format(Math.round(value))
}

// 문자열 입력에서 숫자만 추출해 정수로 변환
export function parseNumber(input) {
  if (typeof input === 'number') return input
  const cleaned = String(input).replace(/[^0-9.-]/g, '')
  const n = parseFloat(cleaned)
  return Number.isNaN(n) ? 0 : n
}

// 퍼센트 포맷 (예: 12.3456 -> "12.3%")
export function formatPercent(value, digits = 1) {
  if (value == null || Number.isNaN(value)) return '0%'
  return `${value.toFixed(digits)}%`
}
