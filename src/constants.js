// ─── App-wide constants ────────────────────────────────────────────────────────

export const MONTHS = [
  { id: '2026-07', label: 'July 2026' },
  { id: '2026-08', label: 'August 2026' },
  { id: '2026-09', label: 'September 2026' },
]

export const DEFAULT_COLLEGES = [
  { id: 'c1', name: 'College 1', type: 'normal',      commission: 2.5 },
  { id: 'c2', name: 'College 2', type: 'normal',      commission: 2.5 },
  { id: 'c3', name: 'College 3', type: 'normal',      commission: 2.5 },
  { id: 'c4', name: 'College 4', type: 'zordr_first', commission: 2.5 },
  { id: 'c5', name: 'College 5', type: 'zordr_first', commission: 2.5 },
]

// ─── GST / Commission constants ────────────────────────────────────────────────
export const FOOD_GST_RATE       = 0.05  // 5% GST inclusive in food price
export const COMMISSION_GST_RATE = 0.18  // 18% GST on Zordr's commission

/**
 * Given a day's GMV (gross merchandise value, GST-inclusive) and a college's
 * commission %, returns the full financial breakup for that college/day.
 *
 *   foodGST          = GMV - GMV * (100 / 105)   (5% GST embedded in GMV)
 *   foodValue        = GMV - foodGST              (GST-exclusive food value)
 *   zordrCommission  = foodValue * commission%    (Zordr's revenue before GST)
 *   commissionGST    = zordrCommission * 18%      (GST Zordr owes on its commission)
 *   vendorPayout     = GMV - foodGST - zordrCommission - commissionGST
 */
export function calcGmvBreakup(gmv, commissionPct) {
  const gmvNum = parseFloat(gmv) || 0
  const rate   = (parseFloat(commissionPct) || 0) / 100

  const foodGST         = gmvNum - (gmvNum * (100 / (100 + FOOD_GST_RATE * 100)))
  const foodValue       = gmvNum - foodGST
  const zordrCommission = foodValue * rate
  const commissionGST   = zordrCommission * COMMISSION_GST_RATE
  const vendorPayout    = gmvNum - foodGST - zordrCommission - commissionGST

  return {
    gmv: gmvNum,
    foodValue,
    foodGST,
    zordrCommission,
    commissionGST,
    vendorPayout,
  }
}

export const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'team',             label: 'Team salaries',        color: '#5DCAA5', budget: 45000 },
  { id: 'adoption',         label: 'Adoption / marketing', color: '#F0997B', budget: 36000 },
  { id: 'travel',           label: 'Travel',               color: '#B4B2A9', budget: 5000  },
  { id: 'infra',            label: 'Server & infra',        color: '#FAC775', budget: 10000 },
  { id: 'hardware_upfront', label: 'Hardware (upfront)',    color: '#AFA9EC', budget: 0     },
  { id: 'hardware_emi',     label: 'Hardware EMI',          color: '#7F77DD', budget: 0     },
  { id: 'other',            label: 'Other / misc',          color: '#D3D1C7', budget: 0     },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function getDaysInMonth(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function formatINR(n) {
  if (n === null || n === undefined || isNaN(n)) return '—'
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100
  const abs = Math.abs(rounded)
  if (abs >= 100000) return '₹' + (rounded / 100000).toFixed(2) + 'L'
  if (abs >= 1000)   return '₹' + (rounded / 1000).toFixed(2) + 'K'
  return '₹' + rounded.toFixed(2)
}

export function pct(val, total) {
  if (!total) return 0
  return Math.round((val / total) * 100)
}

export function generateEmptyDay(dateStr) {
  return { date: dateStr, bank_balance: '', notes: '', expenses: {}, gmv: {} }
}

export function generateInitialData() {
  const data = {}
  MONTHS.forEach(({ id: monthId }) => {
    const days = getDaysInMonth(monthId)
    const [y, m] = monthId.split('-')
    data[monthId] = {}
    for (let d = 1; d <= days; d++) {
      const dateStr = `${y}-${m}-${String(d).padStart(2, '0')}`
      data[monthId][dateStr] = generateEmptyDay(dateStr)
    }
  })
  return data
}
