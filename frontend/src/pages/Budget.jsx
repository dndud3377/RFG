import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { formatWon, formatPercent, parseNumber } from '../utils/format.js'

const CATEGORY_KEYS = {
  income: ['salary', 'bonus', 'etc'],
  expense: ['food', 'transport', 'shopping', 'housing', 'leisure', 'health', 'etc'],
}

const STORAGE_KEY = 'rfg.budget.transactions'

export default function Budget() {
  const { t } = useTranslation()
  const [transactions, setTransactions] = useLocalStorage(STORAGE_KEY, [])

  const [type, setType] = useState('expense')
  const [category, setCategory] = useState('food')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [error, setError] = useState('')

  const catKey = (c) => `budget.categories.${c}`

  const changeType = (nextType) => {
    setType(nextType)
    setCategory(CATEGORY_KEYS[nextType][0])
  }

  const addTransaction = (e) => {
    e.preventDefault()
    const value = parseNumber(amount)
    if (!(value > 0)) {
      setError(t('budget.error.amount'))
      return
    }
    setError('')
    const tx = {
      id: Date.now(),
      type,
      category,
      amount: value,
      memo: memo.trim(),
      date: new Date().toISOString().slice(0, 10),
    }
    setTransactions([tx, ...transactions])
    setAmount('')
    setMemo('')
  }

  const removeTransaction = (id) => {
    setTransactions(transactions.filter((tx) => tx.id !== id))
  }

  const clearAll = () => {
    if (window.confirm(t('budget.list.confirmClear'))) {
      setTransactions([])
    }
  }

  const { income, expense, balance, breakdown } = useMemo(() => {
    let inc = 0
    let exp = 0
    const byCat = {}
    for (const tx of transactions) {
      if (tx.type === 'income') {
        inc += tx.amount
      } else {
        exp += tx.amount
        byCat[tx.category] = (byCat[tx.category] || 0) + tx.amount
      }
    }
    const rows = Object.entries(byCat)
      .map(([cat, total]) => ({ cat, total, pct: exp > 0 ? (total / exp) * 100 : 0 }))
      .sort((a, b) => b.total - a.total)
    return { income: inc, expense: exp, balance: inc - exp, breakdown: rows }
  }, [transactions])

  return (
    <div className="tool-page">
      <Link to="/" className="tool-back">{t('common.backToHome')}</Link>

      <div className="tool-header">
        <h1>{t('budget.title')}</h1>
        <p>{t('budget.subtitle')}</p>
      </div>

      {/* 요약 */}
      <div className="summary-cards">
        <div className="summary-card summary-card--income">
          <div className="summary-card__label">{t('budget.summary.income')}</div>
          <div className="summary-card__value">{formatWon(income)} {t('common.won')}</div>
        </div>
        <div className="summary-card summary-card--expense">
          <div className="summary-card__label">{t('budget.summary.expense')}</div>
          <div className="summary-card__value">{formatWon(expense)} {t('common.won')}</div>
        </div>
        <div className="summary-card summary-card--balance">
          <div className="summary-card__label">{t('budget.summary.balance')}</div>
          <div className="summary-card__value">{formatWon(balance)} {t('common.won')}</div>
        </div>
      </div>

      <div className="grid-2">
        {/* 입력 폼 */}
        <form className="panel" onSubmit={addTransaction}>
          <div className="panel__title">{t('budget.form.title')}</div>

          <div className="field">
            <label className="field__label">{t('budget.form.type')}</label>
            <div className="segment">
              <button type="button" className={`segment__btn ${type === 'expense' ? 'active' : ''}`} onClick={() => changeType('expense')}>
                {t('budget.form.typeExpense')}
              </button>
              <button type="button" className={`segment__btn ${type === 'income' ? 'active' : ''}`} onClick={() => changeType('income')}>
                {t('budget.form.typeIncome')}
              </button>
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="category">{t('budget.form.category')}</label>
            <select id="category" className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORY_KEYS[type].map((c) => (
                <option key={c} value={c}>{t(catKey(c))}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="amount">{t('budget.form.amount')}</label>
            <div className="input-suffix">
              <input
                id="amount" className="input" inputMode="numeric"
                placeholder={t('budget.form.amountPlaceholder')}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span className="input-suffix__unit">{t('common.won')}</span>
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="memo">{t('budget.form.memo')}</label>
            <input
              id="memo" className="input"
              placeholder={t('budget.form.memoPlaceholder')}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="btn">{t('budget.form.add')}</button>
        </form>

        {/* 카테고리 분석 */}
        <div className="panel">
          <div className="panel__title">{t('budget.breakdown.title')}</div>
          {breakdown.length === 0 ? (
            <div className="empty-msg">{t('budget.breakdown.empty')}</div>
          ) : (
            <div className="breakdown">
              {breakdown.map((row) => (
                <div className="breakdown__row" key={row.cat}>
                  <div className="breakdown__meta">
                    <span className="breakdown__name">{t(catKey(row.cat))}</span>
                    <span className="breakdown__val">
                      {formatWon(row.total)} {t('common.won')} · {formatPercent(row.pct)}
                    </span>
                  </div>
                  <div className="breakdown__track">
                    <div className="breakdown__fill" style={{ width: `${row.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 내역 리스트 */}
      <div className="panel">
        <div className="list-head">
          <div className="panel__title" style={{ marginBottom: 0 }}>{t('budget.list.title')}</div>
          {transactions.length > 0 && (
            <button className="btn btn--danger-ghost" onClick={clearAll}>{t('budget.list.clearAll')}</button>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="empty-msg">{t('budget.list.empty')}</div>
        ) : (
          <div className="tx-list">
            {transactions.map((tx) => (
              <div className="tx-item" key={tx.id}>
                <span className="tx-item__cat">{t(catKey(tx.category))}</span>
                <div className="tx-item__body">
                  <div className="tx-item__memo">
                    {tx.memo || t(`budget.form.type${tx.type === 'income' ? 'Income' : 'Expense'}`)}
                  </div>
                  <div className="tx-item__date">{tx.date}</div>
                </div>
                <span className={`tx-item__amount tx-item__amount--${tx.type}`}>
                  {tx.type === 'income' ? '+' : '−'}{formatWon(tx.amount)} {t('common.won')}
                </span>
                <button className="tx-item__del" onClick={() => removeTransaction(tx.id)} aria-label={t('budget.list.delete')}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
