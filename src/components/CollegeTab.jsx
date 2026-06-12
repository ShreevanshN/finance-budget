import { MONTHS, formatINR, pct, calcGmvBreakup } from '../constants.js'
import { Badge } from './UI.jsx'

export default function CollegeTab({ allData, colleges }) {
  const collegeStats = colleges.map(col => {
    let totalGmv      = 0
    let totalRev      = 0
    let adoptionSpend = 0
    const monthlyBreakdown = {}

    MONTHS.forEach(({ id: mId, label: mLabel }) => {
      const days = Object.values(allData[mId] || {})
      let mGmv = 0
      let mRev = 0
      days.forEach(day => {
        const gmvVal  = day.gmv?.[col.id] || 0
        const breakup = calcGmvBreakup(gmvVal, col.commission ?? 2.5)
        mGmv += breakup.gmv
        mRev += breakup.zordrCommission

        const factor = col.type === 'normal' ? 3 : 5
        adoptionSpend += parseFloat(day.expenses?.adoption || 0) / factor
      })
      monthlyBreakdown[mId] = { gmv: mGmv, revenue: mRev, label: mLabel }
      totalGmv += mGmv
      totalRev += mRev
    })

    const adoptionBudget = col.type === 'normal' ? 30000 : 9000

    return { ...col, totalGmv, totalRev, adoptionSpend, adoptionBudget, monthlyBreakdown }
  })

  return (
    <div>
      {collegeStats.map(col => (
        <div key={col.id} style={{
          background: 'var(--bg1)', border: '0.5px solid var(--border)',
          borderRadius: 12, marginBottom: 16, padding: '16px 20px',
        }}>
          {/* College header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 15 }}>{col.name}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                <Badge color={col.type === 'zordr_first' ? 'purple' : 'blue'}>
                  {col.type === 'zordr_first' ? 'Zordr-first' : 'Normal adoption'}
                </Badge>
                <Badge color="gray">{col.commission ?? 2.5}% commission</Badge>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 500, color: col.totalRev > 0 ? '#3B6D11' : 'var(--text3)' }}>
                {formatINR(col.totalRev)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Q1 Zordr revenue</div>
              {col.totalGmv > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{formatINR(col.totalGmv)} GMV</div>
              )}
            </div>
          </div>

          {/* Monthly breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
            {MONTHS.map(({ id: mId, label }) => {
              const mData = col.monthlyBreakdown[mId]
              return (
                <div key={mId} style={{ background: 'var(--bg2)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: mData.revenue > 0 ? '#3B6D11' : 'var(--text3)' }}>
                    {formatINR(mData.revenue)}
                  </div>
                  {mData.gmv > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {formatINR(mData.gmv)} GMV
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Adoption budget progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
              <span style={{ color: 'var(--text2)' }}>Adoption budget used</span>
              <span style={{
                fontWeight: 500,
                color: col.adoptionBudget && col.adoptionSpend > col.adoptionBudget ? '#A32D2D' : 'var(--text1)',
              }}>
                {formatINR(col.adoptionSpend)} / {formatINR(col.adoptionBudget)}
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--bg2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(col.adoptionBudget ? pct(col.adoptionSpend, col.adoptionBudget) : 0, 100)}%`,
                height: '100%', background: '#F0997B', borderRadius: 3, transition: 'width 0.3s',
              }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
