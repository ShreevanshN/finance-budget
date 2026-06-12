import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from './supabaseClient.js'
import {
  MONTHS,
  DEFAULT_COLLEGES,
  DEFAULT_EXPENSE_CATEGORIES,
  generateInitialData,
  generateEmptyDay,
  formatINR,
  calcGmvBreakup,
} from './constants.js'
import { exportToExcel } from './exportExcel.js'
import { Toast } from './components/UI.jsx'
import DayModal          from './components/DayModal.jsx'
import AddEntryModal     from './components/AddEntryModal.jsx'
import SettingsModal     from './components/SettingsModal.jsx'
import DailyLogTab       from './components/DailyLogTab.jsx'
import MonthlySummaryTab from './components/MonthlySummaryTab.jsx'
import CollegeTab        from './components/CollegeTab.jsx'
import BudgetHealthTab   from './components/BudgetHealthTab.jsx'
import GmvSettlementsTab from './components/GmvSettlementsTab.jsx'

const TABS = [
  { id: 'daily',   label: 'Daily log'        },
  { id: 'monthly', label: 'Monthly summary'  },
  { id: 'colleges',label: 'Colleges'         },
  { id: 'gst',     label: 'GMV & Settlements'},
  { id: 'health',  label: 'Budget health'    },
]

export default function App() {
  // ── Core state ───────────────────────────────────────────────────────────────
  const [data,             setData]             = useState(generateInitialData)
  const [colleges,         setColleges]         = useState(DEFAULT_COLLEGES)
  const [expenseCategories,setExpenseCategories]= useState(DEFAULT_EXPENSE_CATEGORIES)

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [activeMonth,   setActiveMonth]   = useState('2026-07')
  const [activeTab,     setActiveTab]     = useState('daily')
  const [editingDay,    setEditingDay]    = useState(null)
  const [showAddEntry,  setShowAddEntry]  = useState(false)
  const [showSettings,  setShowSettings]  = useState(false)
  const [exportMonth,   setExportMonth]   = useState('all')
  const [darkMode,      setDarkMode]      = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  const [loading,  setLoading]  = useState(true)
  const [syncing,  setSyncing]  = useState(false)
  const [toast,    setToast]    = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  // ── Apply theme CSS vars ─────────────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement
    if (darkMode) {
      root.style.setProperty('--bg1',    '#1a1a1a')
      root.style.setProperty('--bg2',    '#262626')
      root.style.setProperty('--bg3',    '#0d0d0d')
      root.style.setProperty('--text1',  '#ffffff')
      root.style.setProperty('--text2',  '#c4c4c4')
      root.style.setProperty('--text3',  '#8a8a8a')
      root.style.setProperty('--border', 'rgba(255,255,255,0.12)')
    } else {
      root.style.setProperty('--bg1',    '#ffffff')
      root.style.setProperty('--bg2',    '#f5f4f1')
      root.style.setProperty('--bg3',    '#eeecea')
      root.style.setProperty('--text1',  '#000000')
      root.style.setProperty('--text2',  '#4a4a4a')
      root.style.setProperty('--text3',  '#7a7a7a')
      root.style.setProperty('--border', 'rgba(0,0,0,0.12)')
    }
  }, [darkMode])

  // ── Load all data from Supabase on mount ─────────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      setLoading(true)
      try {
        // Settings (colleges + categories)
        const { data: settings, error: sErr } = await supabase
          .from('settings')
          .select('*')

        if (!sErr && settings) {
          const colRow = settings.find(s => s.key === 'colleges')
          const catRow = settings.find(s => s.key === 'expense_categories')
          if (colRow?.value?.length) setColleges(colRow.value)
          if (catRow?.value?.length) setExpenseCategories(catRow.value)
        }

        // Daily entries
        const { data: entries, error: eErr } = await supabase
          .from('daily_entries')
          .select('*')

        if (!eErr && entries?.length) {
          const shaped = generateInitialData()
          entries.forEach(entry => {
            const monthId = entry.date.slice(0, 7)
            if (shaped[monthId]) {
              shaped[monthId][entry.date] = {
                date:         entry.date,
                bank_balance: entry.bank_balance ?? '',
                notes:        entry.notes ?? '',
                expenses:     entry.expenses ?? {},
                gmv:          entry.gmv ?? entry.revenue ?? {},
              }
            }
          })
          setData(shaped)
        }
      } catch (e) {
        showToast('Failed to load from Supabase — check your connection', 'error')
        console.error(e)
      }
      setLoading(false)
    }
    loadAll()
  }, [showToast])

  // ── Save a full day ──────────────────────────────────────────────────────────
  const handleSaveDay = useCallback(async (updatedDay) => {
    const monthId = updatedDay.date.slice(0, 7)

    // Optimistic update
    setData(prev => ({
      ...prev,
      [monthId]: {
        ...prev[monthId],
        [updatedDay.date]: { ...prev[monthId]?.[updatedDay.date], ...updatedDay },
      },
    }))

    setSyncing(true)
    const { error } = await supabase.from('daily_entries').upsert({
      date:         updatedDay.date,
      bank_balance: updatedDay.bank_balance ? parseFloat(updatedDay.bank_balance) : null,
      notes:        updatedDay.notes || null,
      expenses:     updatedDay.expenses || {},
      gmv:          updatedDay.gmv || {},
    }, { onConflict: 'date' })
    setSyncing(false)

    if (error) {
      showToast('Error saving: ' + error.message, 'error')
    } else {
      showToast('Day saved')
    }
  }, [showToast])

  // ── Quick-add a single entry ─────────────────────────────────────────────────
  const handleAddEntry = useCallback(async (form) => {
    const monthId  = form.date.slice(0, 7)
    const existing = data[monthId]?.[form.date] || generateEmptyDay(form.date)
    const amount   = parseFloat(form.amount) || 0

    let updatedDay
    if (form.type === 'expense') {
      const prev = parseFloat(existing.expenses?.[form.category] || 0)
      updatedDay = {
        ...existing,
        expenses: { ...existing.expenses, [form.category]: prev + amount },
        notes: [existing.notes, form.notes].filter(Boolean).join('; '),
      }
    } else {
      // 'revenue' type = log GMV for a college; commission etc. are derived
      const prev = parseFloat(existing.gmv?.[form.college] || 0)
      updatedDay = {
        ...existing,
        gmv: { ...existing.gmv, [form.college]: prev + amount },
        notes: [existing.notes, form.notes].filter(Boolean).join('; '),
      }
    }

    await handleSaveDay(updatedDay)
  }, [data, handleSaveDay])

  // ── Save colleges ────────────────────────────────────────────────────────────
  const handleSaveColleges = useCallback(async (newColleges) => {
    setColleges(newColleges)
    setSyncing(true)
    const { error } = await supabase.from('settings').upsert(
      { key: 'colleges', value: newColleges },
      { onConflict: 'key' }
    )
    setSyncing(false)
    if (error) showToast('Error saving colleges', 'error')
    else       showToast('Colleges updated')
  }, [showToast])

  // ── Save categories ──────────────────────────────────────────────────────────
  const handleSaveCategories = useCallback(async (newCats) => {
    setExpenseCategories(newCats)
    setSyncing(true)
    const { error } = await supabase.from('settings').upsert(
      { key: 'expense_categories', value: newCats },
      { onConflict: 'key' }
    )
    setSyncing(false)
    if (error) showToast('Error saving categories', 'error')
    else       showToast('Categories updated')
  }, [showToast])

  // ── Month-level summary for header bar ───────────────────────────────────────
  const monthStats = useMemo(() => {
    let exp = 0, rev = 0
    Object.values(data[activeMonth] || {}).forEach(d => {
      Object.values(d.expenses || {}).forEach(v => { exp += parseFloat(v) || 0 })
      Object.entries(d.gmv || {}).forEach(([collegeId, gmvVal]) => {
        const college = colleges.find(c => c.id === collegeId)
        const breakup = calcGmvBreakup(gmvVal, college?.commission ?? 2.5)
        rev += breakup.zordrCommission
      })
    })
    return { exp, rev, net: rev - exp }
  }, [data, activeMonth, colleges])

  // ── Keyboard shortcut: N = new entry ────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (
        e.key === 'n' &&
        !e.metaKey && !e.ctrlKey &&
        !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)
      ) {
        setShowAddEntry(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg3)' }}>

      {/* ── Top navigation ── */}
      <header style={{
        background: 'var(--bg1)', borderBottom: '0.5px solid var(--border)',
        padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        {/* Logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: '#FE5500',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0,
          }}>Z</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2, color: 'var(--text1)' }}>Zordr</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Q1 Budget Planner · Jul–Sep 2026</div>
          </div>
          {syncing && (
            <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> saving…
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowAddEntry(true)}
            title="Add entry (N)"
            style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              border: '0.5px solid var(--border)', background: 'var(--bg2)',
              color: 'var(--text1)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add entry
          </button>

          {/* Export controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <select
              value={exportMonth}
              onChange={e => setExportMonth(e.target.value)}
              style={{
                padding: '7px 10px', fontSize: 12,
                border: '0.5px solid var(--border)',
                borderRight: 'none',
                borderRadius: '8px 0 0 8px',
                background: 'var(--bg2)', color: 'var(--text2)', cursor: 'pointer',
              }}
            >
              <option value="all">All months</option>
              {MONTHS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <button
              onClick={() => exportToExcel(data, exportMonth, expenseCategories, colleges)}
              style={{
                padding: '7px 14px', fontSize: 12, fontWeight: 500,
                border: '0.5px solid var(--border)',
                borderRadius: '0 8px 8px 0',
                background: '#FE5500', color: '#fff', cursor: 'pointer',
              }}
            >↓ Export</button>
          </div>

          <button
            onClick={() => setShowSettings(true)}
            title="Settings"
            style={{
              width: 34, height: 34, borderRadius: 8,
              border: '0.5px solid var(--border)', background: 'var(--bg2)',
              color: 'var(--text2)', cursor: 'pointer', fontSize: 16,
            }}
          >⚙</button>

          <button
            onClick={() => setDarkMode(d => !d)}
            title={darkMode ? 'Light mode' : 'Dark mode'}
            style={{
              width: 34, height: 34, borderRadius: 8,
              border: '0.5px solid var(--border)', background: 'var(--bg2)',
              color: 'var(--text2)', cursor: 'pointer', fontSize: 15,
            }}
          >{darkMode ? '☀' : '◑'}</button>
        </div>
      </header>

      {/* ── Month selector strip ── */}
      <div style={{
        background: 'var(--bg1)', borderBottom: '0.5px solid var(--border)',
        padding: '0 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex' }}>
          {MONTHS.map(m => (
            <button
              key={m.id}
              onClick={() => setActiveMonth(m.id)}
              style={{
                padding: '11px 16px', fontSize: 13, cursor: 'pointer',
                border: 'none', background: 'none',
                color: activeMonth === m.id ? '#FE5500' : 'var(--text2)',
                fontWeight: activeMonth === m.id ? 600 : 400,
                borderBottom: activeMonth === m.id ? '2px solid #FE5500' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >{m.label}</button>
          ))}
        </div>

        {/* Quick stats shown only on daily tab */}
        {activeTab === 'daily' && (
          <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', gap: 14 }}>
            <span>Exp: <span style={{ color: '#A32D2D', fontWeight: 500 }}>{formatINR(monthStats.exp)}</span></span>
            <span>Rev: <span style={{ color: '#3B6D11', fontWeight: 500 }}>{formatINR(monthStats.rev)}</span></span>
            <span>
              Net:{' '}
              <span style={{ color: monthStats.net >= 0 ? '#3B6D11' : '#A32D2D', fontWeight: 500 }}>
                {monthStats.net >= 0 ? '+' : ''}{formatINR(monthStats.net)}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        background: 'var(--bg1)', borderBottom: '0.5px solid var(--border)',
        padding: '0 24px', display: 'flex', gap: 0,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 14px', fontSize: 12, cursor: 'pointer',
              border: 'none', background: 'none',
              color: activeTab === tab.id ? 'var(--text1)' : 'var(--text3)',
              fontWeight: activeTab === tab.id ? 600 : 400,
              borderBottom: activeTab === tab.id ? '2px solid var(--text1)' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* ── Loading state ── */}
      {loading && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 240, color: 'var(--text3)', fontSize: 14, gap: 10,
          flexDirection: 'column',
        }}>
          <span style={{ fontSize: 28, display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
          <span>Loading data from Supabase…</span>
        </div>
      )}

      {/* ── Main content ── */}
      {!loading && (
        <main style={{ maxWidth: 940, margin: '0 auto', padding: '24px 24px 80px' }}>
          {activeTab === 'daily' && (
            <div style={{
              background: 'var(--bg1)', border: '0.5px solid var(--border)',
              borderRadius: 12, overflow: 'hidden',
            }}>
              <DailyLogTab
                monthData={data[activeMonth] || {}}
                onDayClick={setEditingDay}
                colleges={colleges}
              />
            </div>
          )}

          {activeTab === 'monthly' && (
            <MonthlySummaryTab
              allData={data}
              expenseCategories={expenseCategories}
              colleges={colleges}
            />
          )}

          {activeTab === 'colleges' && (
            <CollegeTab allData={data} colleges={colleges} />
          )}

          {activeTab === 'gst' && (
            <GmvSettlementsTab allData={data} colleges={colleges} />
          )}

          {activeTab === 'health' && (
            <BudgetHealthTab
              allData={data}
              expenseCategories={expenseCategories}
              colleges={colleges}
            />
          )}
        </main>
      )}

      {/* ── Modals ── */}
      {editingDay && (
        <DayModal
          day={editingDay}
          expenseCategories={expenseCategories}
          colleges={colleges}
          onSave={async (updated) => {
            await handleSaveDay({ ...editingDay, ...updated })
          }}
          onClose={() => setEditingDay(null)}
        />
      )}

      {showAddEntry && (
        <AddEntryModal
          expenseCategories={expenseCategories}
          colleges={colleges}
          onSave={handleAddEntry}
          onClose={() => setShowAddEntry(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          colleges={colleges}
          expenseCategories={expenseCategories}
          onSaveColleges={handleSaveColleges}
          onSaveCategories={handleSaveCategories}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />
      )}
    </div>
  )
}
