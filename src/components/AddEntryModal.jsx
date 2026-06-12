import { useState } from 'react'
import { calcGmvBreakup, formatINR } from '../constants.js'
import { ModalBackdrop } from './UI.jsx'

export default function AddEntryModal({ expenseCategories, colleges, onSave, onClose }) {
  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    date:     today,
    type:     'expense',
    category: expenseCategories[0]?.id || '',
    college:  colleges[0]?.id || '',
    amount:   '',
    notes:    '',
  })
  const [saving, setSaving] = useState(false)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async () => {
    if (!form.amount || isNaN(parseFloat(form.amount))) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
    onClose()
  }

  const inputBase = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '0.5px solid var(--border)', background: 'var(--bg2)',
    color: 'var(--text1)', fontSize: 13,
  }

  const label = (text) => (
    <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 5, fontWeight: 500 }}>
      {text}
    </label>
  )

  return (
    <ModalBackdrop onClose={onClose} maxWidth={460}>
      <div style={{
        padding: '16px 20px', borderBottom: '0.5px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontWeight: 500, fontSize: 15 }}>Add entry</div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text2)', fontSize: 22,
        }}>×</button>
      </div>

      <div style={{ padding: 20 }}>
        {/* Date */}
        <div style={{ marginBottom: 14 }}>
          {label('Date')}
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inputBase} />
        </div>

        {/* Type toggle */}
        <div style={{ marginBottom: 14 }}>
          {label('Type')}
          <div style={{ display: 'flex', gap: 8 }}>
            {['expense', 'revenue'].map(t => (
              <button
                key={t}
                onClick={() => set('type', t)}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                  border: '0.5px solid var(--border)',
                  background: form.type === t
                    ? (t === 'expense' ? '#FCEBEB' : '#EAF3DE')
                    : 'var(--bg2)',
                  color: form.type === t
                    ? (t === 'expense' ? '#A32D2D' : '#3B6D11')
                    : 'var(--text2)',
                  fontWeight: form.type === t ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {t === 'expense' ? '↑ Expense' : '↓ GMV (sales)'}
              </button>
            ))}
          </div>
        </div>

        {/* Category / College */}
        {form.type === 'expense' ? (
          <div style={{ marginBottom: 14 }}>
            {label('Expense category')}
            <select value={form.category} onChange={e => set('category', e.target.value)} style={inputBase}>
              {expenseCategories.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        ) : (
          <div style={{ marginBottom: 14 }}>
            {label('College')}
            <select value={form.college} onChange={e => set('college', e.target.value)} style={inputBase}>
              {colleges.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.type === 'zordr_first' ? 'Zordr-first' : 'Normal'} ({c.commission ?? 2.5}% commission)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Amount */}
        <div style={{ marginBottom: form.type === 'revenue' ? 8 : 14 }}>
          {label(form.type === 'revenue' ? 'GMV — total sales (₹)' : 'Amount (₹)')}
          <input
            type="number"
            placeholder="e.g. 12000"
            value={form.amount}
            onChange={e => set('amount', e.target.value)}
            style={inputBase}
            autoFocus
          />
        </div>

        {/* Live GMV breakup preview */}
        {form.type === 'revenue' && parseFloat(form.amount) > 0 && (() => {
          const college = colleges.find(c => c.id === form.college)
          const breakup = calcGmvBreakup(form.amount, college?.commission ?? 2.5)
          return (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8,
              fontSize: 11, color: 'var(--text3)',
              padding: '10px 12px', background: 'var(--bg2)', borderRadius: 8,
              marginBottom: 14,
            }}>
              <div>
                <div style={{ marginBottom: 2 }}>Food value (ex-GST)</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text1)' }}>{formatINR(breakup.foodValue)}</div>
              </div>
              <div>
                <div style={{ marginBottom: 2 }}>Zordr commission ({college?.commission ?? 2.5}%)</div>
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
          )
        })()}

        {/* Notes */}
        <div style={{ marginBottom: 22 }}>
          {label('Notes (optional)')}
          <input
            type="text"
            placeholder="Brief description…"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            style={inputBase}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '9px 18px', borderRadius: 8,
            border: '0.5px solid var(--border)', background: 'none',
            color: 'var(--text2)', cursor: 'pointer', fontSize: 13,
          }}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.amount}
            style={{
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: '#FE5500', color: '#fff',
              cursor: (saving || !form.amount) ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 500,
              opacity: (saving || !form.amount) ? 0.6 : 1,
            }}
          >{saving ? 'Saving…' : 'Add entry'}</button>
        </div>
      </div>
    </ModalBackdrop>
  )
}
