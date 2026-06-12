import { useMemo } from 'react'
import { MONTHS, formatINR, calcGmvBreakup } from '../constants.js'
import { MetricCard, BudgetBar, Badge } from './UI.jsx'

export default function BudgetHealthTab({ allData, expenseCategories, colleges }) {
  const totals = useMemo(() => {
    const exp = {}; expenseCategories.forEach(c => { exp[c.id] = 0 })
    const rev = {}; colleges.forEach(c => { rev[c.id] = 0 })
    const bankBalances = []

    MONTHS.forEach(({ id: mId }) => {
      Object.values(allData[mId] || {}).forEach(day => {
        Object.entries(day.expenses || {}).forEach(([k, v]) => { exp[k] = (exp[k] || 0) + (parseFloat(v) || 0) })
        Object.entries(day.gmv || {}).forEach(([collegeId, gmvVal]) => {
          const college = colleges.find(c => c.id === collegeId)
          const breakup = calcGmvBreakup(gmvVal, college?.commission ?? 2.5)
          rev[collegeId] = (rev[collegeId] || 0) + breakup.zordrCommission
        })
        if (day.bank_balance) bankBalances.push({ date: day.date, balance: parseFloat(day.bank_balance) })
      })
    })

    const totalExp        = Object.values(exp).reduce((s, v) => s + v, 0)
    const totalRev        = Object.values(rev).reduce((s, v) => s + v, 0)
    const latestBank      = bankBalances.sort((a, b) => b.date.localeCompare(a.date))[0]
    const coverageRatio   = totalExp ? Math.round((totalRev / totalExp) * 100) : 0
    const netBurn         = totalExp - totalRev
    const remainingCapital= 2300000 - netBurn

    return { exp, rev, totalExp, totalRev, latestBank, coverageRatio, netBurn, remainingCapital }
  }, [allData, expenseCategories, colleges])

  const Q1_TOTAL_BUDGET = expenseCategories.reduce((s, c) => s + (c.budget || 0) * 3, 0) || 424000
  const burnPct = Math.round((totals.totalExp / Q1_TOTAL_BUDGET) * 100)

  const triggers = [
    {
      condition: 'Monthly burn > ₹1.42L',
      status:    totals.totalExp / 3 > 142000 ? 'breach' : 'ok',
      actual:    formatINR(totals.totalExp / 3) + '/month avg',
    },
    {
      condition: 'Bank balance < ₹1L',
      status:    totals.latestBank && totals.latestBank.balance < 100000 ? 'breach' : 'ok',
      actual:    totals.latestBank ? formatINR(totals.latestBank.balance) : 'not recorded',
    },
    {
      condition: 'Revenue coverage < 40%',
      status:    totals.coverageRatio < 40 && totals.totalExp > 0 ? 'breach' : 'ok',
      actual:    totals.coverageRatio + '%',
    },
    {
      condition: 'Net loss > ₹1.99L',
      status:    totals.netBurn > 199000 ? 'breach' : 'ok',
      actual:    formatINR(totals.netBurn),
    },
  ]

  return (
    <div>
      {/* Metric cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: 10, marginBottom: 24,
      }}>
        <MetricCard
          label="Q1 spend so far"
          value={formatINR(totals.totalExp)}
          sub={`${burnPct}% of budget`}
          accent={burnPct > 100 ? '#A32D2D' : undefined}
        />
        <MetricCard
          label="Q1 revenue so far"
          value={formatINR(totals.totalRev)}
          sub="target ₹2.25L"
          accent="#3B6D11"
        />
        <MetricCard
          label="Net burn"
          value={formatINR(totals.netBurn)}
          sub="target ≤ ₹1.99L"
          accent={totals.netBurn > 199000 ? '#A32D2D' : undefined}
        />
        <MetricCard
          label="Revenue coverage"
          value={totals.coverageRatio + '%'}
          sub="target 53%+"
          accent={totals.coverageRatio >= 53 ? '#3B6D11' : '#854F0B'}
        />
        <MetricCard
          label="Capital remaining"
          value={formatINR(totals.remainingCapital)}
          sub="from ₹23L start"
          accent={totals.remainingCapital < 2100000 ? '#A32D2D' : '#3B6D11'}
        />
        <MetricCard
          label="Latest bank balance"
          value={totals.latestBank ? formatINR(totals.latestBank.balance) : '—'}
          sub={totals.latestBank ? totals.latestBank.date : 'not recorded'}
          accent={totals.latestBank && totals.latestBank.balance < 100000 ? '#A32D2D' : undefined}
        />
      </div>

      {/* Budget vs actual bars */}
      <div style={{
        background: 'var(--bg1)', border: '0.5px solid var(--border)',
        borderRadius: 12, padding: '16px 20px', marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
          Q1 budget vs actual — by category
        </div>
        {expenseCategories.map(cat => (
          <BudgetBar
            key={cat.id}
            label={cat.label}
            spent={totals.exp[cat.id] || 0}
            budget={(cat.budget || 0) * 3}
            color={cat.color}
          />
        ))}
      </div>

      {/* Control triggers */}
      <div style={{
        background: 'var(--bg1)', border: '0.5px solid var(--border)',
        borderRadius: 12, padding: '16px 20px',
      }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
          Control triggers
        </div>
        {triggers.map((t, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '9px 0', borderBottom: i < triggers.length - 1 ? '0.5px solid var(--border)' : 'none',
          }}>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>{t.condition}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>{t.actual}</span>
              <Badge color={t.status === 'breach' ? 'red' : 'green'}>
                {t.status === 'breach' ? '⚠ action' : '✓ ok'}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
