import { useState } from 'react'
import { formatINR, calcGmvBreakup } from '../constants.js'
import { ModalBackdrop } from './UI.jsx'

export default function DayModal({ day, expenseCategories, colleges, onSave, onClose }) {
  const [form, setForm] = useState({
    bank_balance: day.bank_balance ?? '',
    notes: day.notes ?? '',
    expenses: { ...day.expenses },
    gmv:      { ...day.gmv },
  })
  const [saving, setSaving] = useState(false)

  const setExp = (id, val) => setForm(f => ({ ...f, expenses: { ...f.expenses, [id]: val } }))
  const setGmv = (id, val) => setForm(f => ({ ...f, gmv:      { ...f.gmv,      [id]: val } }))

  const totalExp = Object.values(form.expenses).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const totalGmv = Object.values(form.gmv     ).reduce((s, v) => s + (parseFloat(v) || 0), 0)

  // Total Zordr revenue (commission) across colleges for this day
  const totalCommission = colleges.reduce((sum, col) => {
    const breakup = calcGmvBreakup(form.gmv[col.id] || 0, col.commission ?? 2.5)
    return sum + breakup.zordrCommission
  }, 0)

  const dateLabel = new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const handleSave = async () => {
    setSaving(true)
    await onSave({ ...form })
    setSaving(false)
    onClose()
  }

  const field = (val, onChange, placeholder = '₹0', type = 'number') => (
    <input
      type={type}
      placeholder={placeholder}
      value={val}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '8px 10px', borderRadius: 6,
        border: '0.5px solid var(--border)', background: 'var(--bg2)',
        color: 'var(--text1)', fontSize: 13,
      }}
    />
  )

  return (
    <ModalBackdrop onClose={onClose} maxWidth={640}>
      {/* Sticky header */}
      <div style={{
        padding: '16px 20px', borderBottom: '0.5px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, background: 'var(--bg1)', zIndex: 1,
      }}>
        <div>
          <div style={{ fontWeight: 500, fontSize: 15 }}>{dateLabel}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            Expenses: {formatINR(totalExp)} · GMV: {formatINR(totalGmv)} · Zordr revenue: {formatINR(totalCommission)}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text2)', fontSize: 22, lineHeight: 1, padding: 4,
        }}>×</button>
      </div>

      <div style={{ padding: 20 }}>
        {/* Bank balance */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 6, fontWeight: 500 }}>
            Bank balance at end of day (₹)
          </label>
          <input
            type="number"
            placeholder="e.g. 485000"
            value={form.bank_balance}
            onChange={e => setForm(f => ({ ...f, bank_balance: e.target.value }))}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8,
              border: '0.5px solid var(--border)', background: 'var(--bg1)',
              color: 'var(--text1)', fontSize: 14,
            }}
          />
        </div>

        {/* Expenses */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Expenses
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {expenseCategories.map(cat => (
              <div key={cat.id}>
                <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: cat.color, marginRight: 5 }} />
                  {cat.label}
                </label>
                {field(form.expenses[cat.id] ?? '', val => setExp(cat.id, val))}
              </div>
            ))}
          </div>
        </div>

        {/* GMV / Settlement breakup */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            GMV (total sales) by college
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {colleges.map(col => {
              const gmvVal  = form.gmv[col.id] ?? ''
              const breakup = calcGmvBreakup(gmvVal, col.commission ?? 2.5)
              const hasGmv  = (parseFloat(gmvVal) || 0) > 0
              return (
                <div key={col.id} style={{
                  border: '0.5px solid var(--border)', borderRadius: 8,
                  padding: '10px 12px', background: 'var(--bg2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: hasGmv ? 8 : 0 }}>
                    <label style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 5, flex: 1 }}>
                      {col.name}
                      <span style={{
                        fontSize: 10, fontWeight: 500, padding: '1px 5px', borderRadius: 3,
                        background: col.type === 'zordr_first' ? '#EEEDFE' : '#E6F1FB',
                        color: col.type === 'zordr_first' ? '#3C3489' : '#185FA5',
                      }}>
                        {col.type === 'zordr_first' ? 'ZF' : 'N'}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                        ({col.commission ?? 2.5}% commission)
                      </span>
                    </label>
                    <div style={{ width: 140 }}>
                      {field(gmvVal, val => setGmv(col.id, val), '₹0 GMV')}
                    </div>
                  </div>

                  {hasGmv && (
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
                      fontSize: 11, color: 'var(--text3)', paddingTop: 8,
                      borderTop: '0.5px solid var(--border)',
                    }}>
                      <div>
                        <div style={{ marginBottom: 2 }}>Food value (ex-GST)</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text1)' }}>{formatINR(breakup.foodValue)}</div>
                      </div>
                      <div>
                        <div style={{ marginBottom: 2 }}>Zordr commission</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#3B6D11' }}>{formatINR(breakup.zordrCommission)}</div>
                      </div>
                      <div>
                        <div style={{ marginBottom: 2 }}>GST on commission (18%)</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#854F0B' }}>{formatINR(breakup.commissionGST)}</div>
                      </div>
                      <div>
                        <div style={{ marginBottom: 2 }}>Vendor payout</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text1)' }}>{formatINR(breakup.vendorPayout)}</div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {totalGmv > 0 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 12, color: 'var(--text2)', marginTop: 10,
              padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8,
            }}>
              <span>Total GMV: <strong style={{ color: 'var(--text1)' }}>{formatINR(totalGmv)}</strong></span>
              <span>Total Zordr revenue: <strong style={{ color: '#3B6D11' }}>{formatINR(totalCommission)}</strong></span>
            </div>
          )}
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Notes</label>
          <textarea
            placeholder="Any context — unusual spend, college status change, hardware delivery…"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8,
              border: '0.5px solid var(--border)', background: 'var(--bg1)',
              color: 'var(--text1)', fontSize: 13, resize: 'vertical',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '9px 18px', borderRadius: 8,
            border: '0.5px solid var(--border)', background: 'none',
            color: 'var(--text2)', cursor: 'pointer', fontSize: 13,
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '9px 20px', borderRadius: 8, border: 'none',
            background: '#FE5500', color: '#fff',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 500, opacity: saving ? 0.7 : 1,
          }}>{saving ? 'Saving…' : 'Save day'}</button>
        </div>
      </div>
    </ModalBackdrop>
  )
}
