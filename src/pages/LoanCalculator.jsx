import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { calculateLoan } from '../utils/loan.js'
import { formatWon, parseNumber } from '../utils/format.js'

const METHODS = [
  { id: 'equalPayment', labelKey: 'loan.form.methodEqualPayment', hintKey: 'loan.form.methodEqualPaymentHint' },
  { id: 'equalPrincipal', labelKey: 'loan.form.methodEqualPrincipal', hintKey: 'loan.form.methodEqualPrincipalHint' },
  { id: 'bullet', labelKey: 'loan.form.methodBullet', hintKey: 'loan.form.methodBulletHint' },
]

export default function LoanCalculator() {
  const { t } = useTranslation()
  const [principal, setPrincipal] = useState('')
  const [annualRate, setAnnualRate] = useState('')
  const [years, setYears] = useState('3')
  const [method, setMethod] = useState('equalPayment')

  const result = useMemo(() => {
    const p = parseNumber(principal)
    const rate = parseNumber(annualRate)
    const months = parseNumber(years) * 12
    if (!p || !months) return null
    return calculateLoan({ principal: p, annualRate: rate, months, method })
  }, [principal, annualRate, years, method])

  const activeHint = METHODS.find((m) => m.id === method)?.hintKey

  const reset = () => {
    setPrincipal('')
    setAnnualRate('')
    setYears('3')
    setMethod('equalPayment')
  }

  return (
    <div className="tool-page">
      <Link to="/" className="tool-back">{t('common.backToHome')}</Link>

      <div className="tool-header">
        <h1>{t('loan.title')}</h1>
        <p>{t('loan.subtitle')}</p>
      </div>

      <div className="grid-2">
        {/* 입력 */}
        <div className="panel">
          <div className="panel__title">{t('loan.title')}</div>

          <div className="field">
            <label className="field__label" htmlFor="principal">{t('loan.form.principal')}</label>
            <div className="input-suffix">
              <input
                id="principal" className="input" inputMode="numeric"
                placeholder={t('loan.form.principalPlaceholder')}
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
              />
              <span className="input-suffix__unit">{t('common.won')}</span>
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="rate">{t('loan.form.annualRate')}</label>
            <div className="input-suffix">
              <input
                id="rate" className="input" inputMode="decimal"
                placeholder={t('loan.form.annualRatePlaceholder')}
                value={annualRate}
                onChange={(e) => setAnnualRate(e.target.value)}
              />
              <span className="input-suffix__unit">{t('common.percent')}</span>
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="years">{t('loan.form.termYears')}</label>
            <div className="input-suffix">
              <input
                id="years" className="input" inputMode="numeric"
                value={years}
                onChange={(e) => setYears(e.target.value)}
              />
              <span className="input-suffix__unit">{t('common.years')}</span>
            </div>
          </div>

          <div className="field">
            <label className="field__label">{t('loan.form.method')}</label>
            <div className="segment">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  className={`segment__btn ${method === m.id ? 'active' : ''}`}
                  onClick={() => setMethod(m.id)}
                >
                  {t(m.labelKey)}
                </button>
              ))}
            </div>
            <div className="segment__hint">{t(activeHint)}</div>
          </div>

          <button className="btn btn--ghost btn--sm" onClick={reset}>{t('common.reset')}</button>
        </div>

        {/* 결과 */}
        <div className="panel">
          <div className="panel__title">{t('loan.result.title')}</div>

          {!result ? (
            <div className="result-empty">{t('loan.result.empty')}</div>
          ) : (
            <>
              <div className="result-hero">
                <div className="result-hero__label">
                  {method === 'equalPrincipal'
                    ? t('loan.result.firstMonthPayment')
                    : t('loan.result.monthlyPayment')}
                </div>
                <div className="result-hero__value">
                  {formatWon(
                    method === 'equalPrincipal' ? result.firstMonthPayment : result.monthlyPayment,
                  )}{' '}
                  {t('common.won')}
                </div>
              </div>

              <div className="result-rows">
                {method === 'equalPrincipal' && (
                  <div className="result-row">
                    <span className="result-row__label">{t('loan.result.lastMonthPayment')}</span>
                    <span className="result-row__value">
                      {formatWon(result.lastMonthPayment)} {t('common.won')}
                    </span>
                  </div>
                )}
                <div className="result-row">
                  <span className="result-row__label">{t('loan.result.totalInterest')}</span>
                  <span className="result-row__value">
                    {formatWon(result.totalInterest)} {t('common.won')}
                  </span>
                </div>
                <div className="result-row">
                  <span className="result-row__label">{t('loan.result.totalPayment')}</span>
                  <span className="result-row__value">
                    {formatWon(result.totalPayment)} {t('common.won')}
                  </span>
                </div>
              </div>

              <p className="result-note">{t('loan.result.note')}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
