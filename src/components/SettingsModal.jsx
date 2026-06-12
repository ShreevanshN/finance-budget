import { useState } from 'react'
import { ModalBackdrop } from './UI.jsx'

const COLOR_PRESETS = [
  '#5DCAA5','#F0997B','#FAC775','#AFA9EC','#7F77DD',
  '#D3D1C7','#B4B2A9','#FE5500','#E24B4A','#3B6D11',
]

export default function SettingsModal({ colleges, expenseCategories, onSaveColleges, onSaveCategories, onClose }) {
  const [tab, setTab]       = useState('colleges')
  const [localColleges, setLocalColleges] = useState(() => colleges.map(c => ({ ...c })))
  const [localCats, setLocalCats]         = useState(() => expenseCategories.map(c => ({ ...c })))
  const [saving, setSaving] = useState(false)

  const addCollege = () =>
    setLocalColleges(c => [...c, { id: 'c' + Date.now(), name: 'New College', type: 'normal', commission: 2.5 }])

  const removeCollege = id =>
    setLocalColleges(c => c.filter(x => x.id !== id))

  const updateCollege = (id, field, val) =>
    setLocalColleges(c => c.map(x => x.id === id ? { ...x, [field]: val } : x))

  const addCat = () =>
    setLocalCats(c => [...c, { id: 'cat' + Date.now(), label: 'New Category', color: '#B4B2A9', budget: 0 }])

  const removeCat = id =>
    setLocalCats(c => c.filter(x => x.id !== id))

  const updateCat = (id, field, val) =>
    setLocalCats(c => c.map(x => x.id === id ? { ...x, [field]: val } : x))

  const handleSave = async () => {
    setSaving(true)
    if (tab === 'colleges') await onSaveColleges(localColleges)
    else                     await onSaveCategories(localCats)
    setSaving(false)
    onClose()
  }

  const inputBase = {
    padding: '7px 10px', borderRadius: 6, fontSize: 13,
    border: '0.5px solid var(--border)', background: 'var(--bg2)',
    color: 'var(--text1)',
  }

  return (
    <ModalBackdrop onClose={onClose} maxWidth={580}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '0.5px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, background: 'var(--bg1)', zIndex: 1,
      }}>
        <div style={{ fontWeight: 500, fontSize: 15 }}>Settings</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 22 }}>×</button>
      </div>

      {/* Tab strip */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)' }}>
        {[
          { id: 'colleges',   label: '🏫 Colleges' },
          { id: 'categories', label: '📂 Expense Categories' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '11px', fontSize: 13, cursor: 'pointer',
            border: 'none', background: 'none',
            color:      tab === t.id ? '#FE5500' : 'var(--text2)',
            fontWeight: tab === t.id ? 600 : 400,
            borderBottom: tab === t.id ? '2px solid #FE5500' : '2px solid transparent',
            transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: 20 }}>

        {/* ── Colleges tab ── */}
        {tab === 'colleges' && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
              Edit college names, types, and commission %. Changes are saved to Supabase and apply across the whole app.
            </div>

            {/* Column headings */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 90px 36px', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>Name</span>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>Type</span>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>Commission %</span>
              <span />
            </div>

            {localColleges.map(col => (
              <div key={col.id} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 90px 36px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input
                  value={col.name}
                  onChange={e => updateCollege(col.id, 'name', e.target.value)}
                  style={{ ...inputBase, width: '100%' }}
                />
                <select
                  value={col.type}
                  onChange={e => updateCollege(col.id, 'type', e.target.value)}
                  style={{ ...inputBase, width: '100%' }}
                >
                  <option value="normal">Normal</option>
                  <option value="zordr_first">Zordr-first</option>
                </select>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={col.commission ?? 2.5}
                  onChange={e => updateCollege(col.id, 'commission', parseFloat(e.target.value) || 0)}
                  style={{ ...inputBase, width: '100%' }}
                  placeholder="2.5"
                />
                <button onClick={() => removeCollege(col.id)} style={{
                  background: '#FCEBEB', border: 'none', color: '#A32D2D',
                  borderRadius: 6, padding: '7px 10px', cursor: 'pointer', fontSize: 13, height: 36,
                }}>✕</button>
              </div>
            ))}

            <button onClick={addCollege} style={{
              width: '100%', padding: 9, borderRadius: 8, fontSize: 13,
              border: '1px dashed var(--border)', background: 'none',
              color: '#FE5500', cursor: 'pointer', marginTop: 4,
            }}>+ Add college</button>
          </div>
        )}

        {/* ── Categories tab ── */}
        {tab === 'categories' && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
              Edit expense categories, their accent colors, and monthly budgets.
            </div>

            {/* Column headings */}
            <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 100px 36px', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>Color</span>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>Label</span>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>Monthly budget</span>
              <span />
            </div>

            {localCats.map(cat => (
              <div key={cat.id} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 100px 36px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input
                  type="color"
                  value={cat.color}
                  onChange={e => updateCat(cat.id, 'color', e.target.value)}
                  style={{
                    width: 36, height: 36, padding: 2, borderRadius: 6,
                    border: '0.5px solid var(--border)', cursor: 'pointer',
                    background: 'var(--bg2)',
                  }}
                />
                <input
                  value={cat.label}
                  onChange={e => updateCat(cat.id, 'label', e.target.value)}
                  style={{ ...inputBase, width: '100%' }}
                />
                <input
                  type="number"
                  value={cat.budget}
                  onChange={e => updateCat(cat.id, 'budget', parseFloat(e.target.value) || 0)}
                  style={{ ...inputBase, width: '100%' }}
                  placeholder="0"
                />
                <button onClick={() => removeCat(cat.id)} style={{
                  background: '#FCEBEB', border: 'none', color: '#A32D2D',
                  borderRadius: 6, padding: '7px 10px', cursor: 'pointer', fontSize: 13, height: 36,
                }}>✕</button>
              </div>
            ))}

            <button onClick={addCat} style={{
              width: '100%', padding: 9, borderRadius: 8, fontSize: 13,
              border: '1px dashed var(--border)', background: 'none',
              color: '#FE5500', cursor: 'pointer', marginTop: 4,
            }}>+ Add category</button>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
          <button onClick={onClose} style={{
            padding: '9px 18px', borderRadius: 8,
            border: '0.5px solid var(--border)', background: 'none',
            color: 'var(--text2)', cursor: 'pointer', fontSize: 13,
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '9px 22px', borderRadius: 8, border: 'none',
            background: '#FE5500', color: '#fff',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 500, opacity: saving ? 0.7 : 1,
          }}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </ModalBackdrop>
  )
}
