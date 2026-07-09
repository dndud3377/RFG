// 대출 상환 계산 로직

// method: 'equalPayment' | 'equalPrincipal' | 'bullet'
// principal: 원금(원), annualRate: 연이자율(%), months: 개월 수
export function calculateLoan({ principal, annualRate, months, method }) {
  const P = Number(principal)
  const n = Math.round(Number(months))
  const r = Number(annualRate) / 100 / 12 // 월 이자율

  if (!(P > 0) || !(n > 0) || annualRate < 0) {
    return null
  }

  if (method === 'equalPayment') {
    // 원리금 균등
    const monthly = r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n))
    const totalPayment = monthly * n
    const totalInterest = totalPayment - P
    return { method, monthlyPayment: monthly, totalInterest, totalPayment }
  }

  if (method === 'equalPrincipal') {
    // 원금 균등
    const principalPart = P / n
    const firstInterest = P * r
    const lastInterest = principalPart * r
    const firstMonthPayment = principalPart + firstInterest
    const lastMonthPayment = principalPart + lastInterest
    const totalInterest = (r * P * (n + 1)) / 2
    const totalPayment = P + totalInterest
    return { method, firstMonthPayment, lastMonthPayment, totalInterest, totalPayment }
  }

  // 만기 일시 (bullet)
  const monthlyInterest = P * r
  const totalInterest = monthlyInterest * n
  const totalPayment = P + totalInterest
  return { method, monthlyPayment: monthlyInterest, totalInterest, totalPayment }
}
