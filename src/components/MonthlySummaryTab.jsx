import { MONTHS, formatINR, pct, calcGmvBreakup } from '../constants.js'
import { Badge, BudgetBar } from './UI.jsx'

export default function MonthlySummaryTab({ allData, expenseCategories, colleges }) {
  const summaries = MONTHS.map(({ id, label }) => {
    const days = Object.values(allData[id] || {})
    const totalExp = {}; expenseCategories.forEach(c => { totalExp[c.id] = 0 })

    // Per-college GMV + derived revenue (commission)
    const totalGmv = {}; colleges.forEach(c => { totalGmv[c.id] = 0 })
    const totalRev = {}; colleges.forEach(c => { totalRev[c.id] = 0 })

    days.forEach(day => {
      Object.entries(day.expenses || {}).forEach(([k, v]) => { totalExp[k] = (totalExp[k] || 0) + (parseFloat(v) || 0) })
      Object.entries(day.gmv || {}).forEach(([collegeId, gmvVal]) => {
        const college = colleges.find(c => c.id === collegeId)
        const breakup = calcGmvBreakup(gmvVal, college?.commission ?? 2.5)
        totalGmv[collegeId] = (totalGmv[collegeId] || 0) + breakup.gmv
        totalRev[collegeId] = (totalRev[collegeId] || 0) + breakup.zordrCommission
      })
    })

    const expTotal = Object.values(totalExp).reduce((s, v) => s + v, 0)
    const gmvTotal = Object.values(totalGmv).reduce((s, v) => s + v, 0)
    const revTotal = Object.values(totalRev).reduce((s, v) => s + v, 0)
    const net      = revTotal - expTotal

    const sorted     = days.filter(d => d.bank_balance).sort((a, b) => b.date.localeCompare(a.date))
    const bankBalance= sorted.length ? parseFloat(sorted[0].bank_balance) : null

    return { id, label, totalExp, totalGmv, totalRev, expTotal, gmvTotal, revTotal, net, bankBalance }
  })

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {summaries.map(s => (
        <div key={s.id} style={{
          background: 'var(--bg1)', border: '0.5px solid var(--border)',
          borderRadius: 12, marginBottom: 20, overflow: 'hidden',
        }}>
          {/* Month header */}
          <div style={{
            padding: '14px 20px', borderBottom: '0.5px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ fontWeight: 500, fontSize: 15 }}>{s.label}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Badge color={s.net >= 0 ? 'green' : 'red'}>
                Net {s.net >= 0 ? '+' : ''}{formatINR(s.net)}
              </Badge>
              {s.bankBalance !== null && (
                <Badge color="blue">Bank {formatINR(s.bankBalance)}</Badge>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {/* Expenses */}
            <div style={{ padding: '16px 20px', borderRight: '0.5px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Expenses — {formatINR(s.expTotal)}
              </div>
              {expenseCategories.map(cat => (
                (s.totalExp[cat.id] || 0) > 0 && (
                  <BudgetBar
                    key={cat.id}
                    label={cat.label}
                    spent={s.totalExp[cat.id]}
                    budget={cat.budget}
                    color={cat.color}
                  />
                )
              ))}
              {s.expTotal === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>No expenses logged.</div>
              )}
            </div>

            {/* Revenue (derived from GMV) */}
            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Zordr revenue — {formatINR(s.revTotal)}
                <span style={{ textTransform: 'none', fontWeight: 400 }}> · GMV {formatINR(s.gmvTotal)}</span>
              </div>
              {colleges.map(col => {
                const rev = s.totalRev[col.id] || 0
                const gmv = s.totalGmv[col.id] || 0
                return (
                  <div key={col.id} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        {col.name}
                        <span style={{
                          fontSize: 10, fontWeight: 500, padding: '1px 5px', borderRadius: 3,
                          background: col.type === 'zordr_first' ? '#EEEDFE' : '#E6F1FB',
                          color:      col.type === 'zordr_first' ? '#3C3489' : '#185FA5',
                        }}>
                          {col.type === 'zordr_first' ? 'ZF' : 'N'}
                        </span>
                      </span>
                      <span style={{ color: 'var(--text1)', fontWeight: 500 }}>
                        {formatINR(rev)}
                        {gmv > 0 && <span style={{ color: 'var(--text3)', fontWeight: 400 }}> ({formatINR(gmv)} GMV)</span>}
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(pct(gmv, 600000), 100)}%`,
                        height: '100%', background: '#5DCAA5', borderRadius: 3,
                      }} />
                    </div>
                  </div>
                )
              })}
              {s.gmvTotal === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>No GMV logged.</div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
