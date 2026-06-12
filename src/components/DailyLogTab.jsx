import { formatINR, calcGmvBreakup } from '../constants.js'
import { Badge } from './UI.jsx'

export default function DailyLogTab({ monthData, onDayClick, colleges }) {
  const days  = Object.values(monthData).sort((a, b) => a.date.localeCompare(b.date))
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div>
      {/* Column headers */}
      <div style={{
        display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr 1fr 88px',
        padding: '8px 16px', borderBottom: '0.5px solid var(--border)',
        fontSize: 11, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500,
      }}>
        <span>Date</span>
        <span>Expenses</span>
        <span>GMV</span>
        <span>Zordr revenue</span>
        <span>Bank balance</span>
        <span />
      </div>

      {days.map(day => {
        const totalExp = Object.values(day.expenses || {}).reduce((s, v) => s + (parseFloat(v) || 0), 0)
        const totalGmv = Object.values(day.gmv || {}).reduce((s, v) => s + (parseFloat(v) || 0), 0)
        const totalRev = Object.entries(day.gmv || {}).reduce((sum, [collegeId, gmvVal]) => {
          const college = colleges?.find(c => c.id === collegeId)
          return sum + calcGmvBreakup(gmvVal, college?.commission ?? 2.5).zordrCommission
        }, 0)
        const net      = totalRev - totalExp
        const hasData  = totalExp > 0 || totalGmv > 0 || day.bank_balance
        const isToday  = day.date === today
        const isFuture = day.date > today
        const d        = new Date(day.date + 'T00:00:00')
        const dayLabel = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })
        const isWeekend= d.getDay() === 0 || d.getDay() === 6

        return (
          <div
            key={day.date}
            onClick={() => !isFuture && onDayClick(day)}
            style={{
              display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr 1fr 88px',
              padding: '11px 16px', borderBottom: '0.5px solid var(--border)',
              cursor: isFuture ? 'default' : 'pointer',
              background: isToday ? 'var(--bg2)' : 'transparent',
              opacity: isFuture ? 0.35 : 1,
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => { if (!isFuture) e.currentTarget.style.background = 'var(--bg2)' }}
            onMouseLeave={e => { if (!isToday)  e.currentTarget.style.background = 'transparent' }}
          >
            <div>
              <div style={{
                fontSize: 13,
                fontWeight: isToday ? 600 : 400,
                color: isWeekend ? 'var(--text3)' : 'var(--text1)',
              }}>
                {dayLabel}
              </div>
              {isToday && (
                <div style={{ fontSize: 10, color: '#FE5500', fontWeight: 500, marginTop: 1 }}>today</div>
              )}
            </div>

            <div style={{ fontSize: 13, color: totalExp > 0 ? '#A32D2D' : 'var(--text3)', alignSelf: 'center' }}>
              {totalExp > 0 ? formatINR(totalExp) : '—'}
            </div>

            <div style={{ fontSize: 13, color: totalGmv > 0 ? 'var(--text1)' : 'var(--text3)', alignSelf: 'center' }}>
              {totalGmv > 0 ? formatINR(totalGmv) : '—'}
            </div>

            <div style={{ fontSize: 13, color: totalRev > 0 ? '#3B6D11' : 'var(--text3)', alignSelf: 'center' }}>
              {totalRev > 0 ? formatINR(totalRev) : '—'}
            </div>

            <div style={{ fontSize: 13, color: 'var(--text2)', alignSelf: 'center' }}>
              {day.bank_balance ? formatINR(parseFloat(day.bank_balance)) : '—'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
              {hasData && (
                <Badge color={net >= 0 ? 'green' : 'red'}>
                  {net >= 0 ? '+' : ''}{formatINR(net)}
                </Badge>
              )}
              {!isFuture && <span style={{ fontSize: 18, color: 'var(--text3)' }}>›</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
