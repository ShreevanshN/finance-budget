import * as XLSX from 'xlsx'
import { MONTHS, calcGmvBreakup } from './constants.js'

const r2 = (n) => Math.round(((parseFloat(n) || 0) + Number.EPSILON) * 100) / 100

export function exportToExcel(allData, month, expenseCategories, colleges) {
  const wb = XLSX.utils.book_new()

  const monthsToExport = month === 'all'
    ? MONTHS
    : MONTHS.filter(m => m.id === month)

  // ── Daily Log sheet ──────────────────────────────────────────────────────────
  const dailyRows = [[
    'Date', 'Day',
    ...expenseCategories.map(c => c.label),
    'Total Expenses',
    'Total GMV',
    'Total Zordr Revenue (Commission)',
    'Net', 'Bank Balance', 'Notes',
  ]]

  monthsToExport.forEach(({ id: mId, label: mLabel }) => {
    dailyRows.push([mLabel])

    const days = Object.values(allData[mId] || {})
      .sort((a, b) => a.date.localeCompare(b.date))

    days.forEach(day => {
      const d        = new Date(day.date + 'T00:00:00')
      const expVals  = expenseCategories.map(c => r2(day.expenses?.[c.id] || 0))
      const totalExp = r2(expVals.reduce((s, v) => s + v, 0))

      let totalGmv = 0, totalRev = 0
      Object.entries(day.gmv || {}).forEach(([collegeId, gmvVal]) => {
        const college = colleges.find(c => c.id === collegeId)
        const b = calcGmvBreakup(gmvVal, college?.commission ?? 2.5)
        totalGmv += b.gmv
        totalRev += b.zordrCommission
      })

      dailyRows.push([
        day.date,
        d.toLocaleDateString('en-IN', { weekday: 'short' }),
        ...expVals,
        totalExp,
        r2(totalGmv),
        r2(totalRev),
        r2(totalRev - totalExp),
        parseFloat(day.bank_balance || 0) ? r2(day.bank_balance) : '',
        day.notes || '',
      ])
    })
    dailyRows.push([])
  })

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dailyRows), 'Daily Log')

  // ── Monthly Summary sheet ────────────────────────────────────────────────────
  const summaryRows = [[
    'Month', ...expenseCategories.map(c => c.label), 'Total Expenses',
    'Total GMV', 'Total Zordr Revenue', 'Net', 'Latest Bank Balance',
  ]]

  monthsToExport.forEach(({ id: mId, label: mLabel }) => {
    const days    = Object.values(allData[mId] || {})
    const expTots = {}; expenseCategories.forEach(c => { expTots[c.id] = 0 })
    let totalGmv = 0, totalRev = 0

    days.forEach(day => {
      Object.entries(day.expenses || {}).forEach(([k, v]) => { expTots[k] = (expTots[k] || 0) + (parseFloat(v) || 0) })
      Object.entries(day.gmv || {}).forEach(([collegeId, gmvVal]) => {
        const college = colleges.find(c => c.id === collegeId)
        const b = calcGmvBreakup(gmvVal, college?.commission ?? 2.5)
        totalGmv += b.gmv
        totalRev += b.zordrCommission
      })
    })

    const totalExp   = r2(Object.values(expTots).reduce((s, v) => s + v, 0))
    const bankDays   = days.filter(d => d.bank_balance).sort((a, b) => b.date.localeCompare(a.date))
    const latestBank = bankDays.length ? r2(bankDays[0].bank_balance) : ''

    summaryRows.push([
      mLabel,
      ...expenseCategories.map(c => r2(expTots[c.id] || 0)),
      totalExp,
      r2(totalGmv),
      r2(totalRev),
      r2(totalRev - totalExp),
      latestBank,
    ])
  })

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Monthly Summary')

  // ── Budget vs Actual sheet ───────────────────────────────────────────────────
  const budgetRows = [['Category', 'Monthly Budget', 'Q1 Budget', 'Q1 Actual', 'Variance', '% Used']]

  const q1Actuals = {}; expenseCategories.forEach(c => { q1Actuals[c.id] = 0 })
  monthsToExport.forEach(({ id: mId }) => {
    Object.values(allData[mId] || {}).forEach(day => {
      Object.entries(day.expenses || {}).forEach(([k, v]) => {
        q1Actuals[k] = (q1Actuals[k] || 0) + (parseFloat(v) || 0)
      })
    })
  })

  expenseCategories.forEach(cat => {
    const q1Budget = (cat.budget || 0) * 3
    const actual   = r2(q1Actuals[cat.id] || 0)
    const variance = r2(q1Budget - actual)
    const pctUsed  = q1Budget ? r2((actual / q1Budget) * 100) : 'N/A'
    budgetRows.push([cat.label, cat.budget || 0, q1Budget, actual, variance, pctUsed])
  })

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(budgetRows), 'Budget vs Actual')

  // ── GMV & Revenue sheet ──────────────────────────────────────────────────────
  const gmvRows = [[
    'Month', 'College', 'Type', 'Commission %',
    'GMV (incl. 5% GST)', 'Food Value (ex-GST)', 'Zordr Commission', 'Vendor Payout',
  ]]

  monthsToExport.forEach(({ id: mId, label: mLabel }) => {
    const days = Object.values(allData[mId] || {})
    colleges.forEach(col => {
      let agg = { gmv: 0, foodValue: 0, foodGST: 0, zordrCommission: 0, commissionGST: 0, vendorPayout: 0 }
      days.forEach(day => {
        const gmvVal = day.gmv?.[col.id] || 0
        if (parseFloat(gmvVal) > 0) {
          const b = calcGmvBreakup(gmvVal, col.commission ?? 2.5)
          Object.keys(agg).forEach(k => { agg[k] += b[k] })
        }
      })
      if (agg.gmv > 0) {
        gmvRows.push([
          mLabel, col.name,
          col.type === 'zordr_first' ? 'Zordr-first' : 'Normal',
          col.commission ?? 2.5,
          r2(agg.gmv), r2(agg.foodValue), r2(agg.zordrCommission), r2(agg.vendorPayout),
        ])
      }
    })
  })

  if (gmvRows.length > 1) {
    const tot = gmvRows.slice(1).reduce((acc, row) => ({
      gmv: acc.gmv + row[4], foodValue: acc.foodValue + row[5],
      zordrCommission: acc.zordrCommission + row[6], vendorPayout: acc.vendorPayout + row[7],
    }), { gmv: 0, foodValue: 0, zordrCommission: 0, vendorPayout: 0 })
    gmvRows.push([])
    gmvRows.push(['TOTAL', '', '', '', r2(tot.gmv), r2(tot.foodValue), r2(tot.zordrCommission), r2(tot.vendorPayout)])
  }

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(gmvRows), 'GMV & Revenue')

  // ── Food GST 5% sheet ────────────────────────────────────────────────────────
  const period = month === 'all' ? 'All Months (Q1)' : MONTHS.find(m => m.id === month)?.label
  const foodGstRows = [
    ['Zordr Food Private Limited'],
    [`Food GST Report — ${period}`],
    ['GST Rate: 5% on food value (CGST 2.5% + SGST 2.5%)'],
    [],
    ['Month', 'College', 'GMV (incl. GST)', 'Taxable Value (ex-GST)', 'CGST @ 2.5%', 'SGST @ 2.5%', 'Total Food GST (5%)'],
  ]

  monthsToExport.forEach(({ id: mId, label: mLabel }) => {
    const days = Object.values(allData[mId] || {})
    colleges.forEach(col => {
      let agg = { gmv: 0, foodValue: 0, foodGST: 0 }
      days.forEach(day => {
        const gmvVal = day.gmv?.[col.id] || 0
        if (parseFloat(gmvVal) > 0) {
          const b = calcGmvBreakup(gmvVal, col.commission ?? 2.5)
          agg.gmv       += b.gmv
          agg.foodValue += b.foodValue
          agg.foodGST   += b.foodGST
        }
      })
      if (agg.gmv > 0) {
        foodGstRows.push([
          mLabel, col.name,
          r2(agg.gmv), r2(agg.foodValue),
          r2(agg.foodGST / 2), r2(agg.foodGST / 2), r2(agg.foodGST),
        ])
      }
    })
  })

  if (foodGstRows.length > 5) {
    const dataRows = foodGstRows.slice(5)
    const tot = dataRows.reduce((acc, row) => ({
      gmv: acc.gmv + row[2], foodValue: acc.foodValue + row[3],
      cgst: acc.cgst + row[4], sgst: acc.sgst + row[5], total: acc.total + row[6],
    }), { gmv: 0, foodValue: 0, cgst: 0, sgst: 0, total: 0 })
    foodGstRows.push([])
    foodGstRows.push(['TOTAL', '', r2(tot.gmv), r2(tot.foodValue), r2(tot.cgst), r2(tot.sgst), r2(tot.total)])
  }

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(foodGstRows), 'Food GST 5%')

  // ── Service GST 18% sheet ────────────────────────────────────────────────────
  const commGstRows = [
    ['Zordr Food Private Limited'],
    [`Service GST Report — ${period}`],
    ['GST Rate: 18% on Zordr commission (CGST 9% + SGST 9%)'],
    [],
    ['Month', 'College', 'Commission (excl. GST)', 'CGST @ 9%', 'SGST @ 9%', 'Total Service GST (18%)', 'Total Commission + GST'],
  ]

  monthsToExport.forEach(({ id: mId, label: mLabel }) => {
    const days = Object.values(allData[mId] || {})
    colleges.forEach(col => {
      let agg = { zordrCommission: 0, commissionGST: 0 }
      days.forEach(day => {
        const gmvVal = day.gmv?.[col.id] || 0
        if (parseFloat(gmvVal) > 0) {
          const b = calcGmvBreakup(gmvVal, col.commission ?? 2.5)
          agg.zordrCommission += b.zordrCommission
          agg.commissionGST   += b.commissionGST
        }
      })
      if (agg.zordrCommission > 0) {
        commGstRows.push([
          mLabel, col.name,
          r2(agg.zordrCommission),
          r2(agg.commissionGST / 2), r2(agg.commissionGST / 2),
          r2(agg.commissionGST),
          r2(agg.zordrCommission + agg.commissionGST),
        ])
      }
    })
  })

  if (commGstRows.length > 5) {
    const dataRows = commGstRows.slice(5)
    const tot = dataRows.reduce((acc, row) => ({
      comm: acc.comm + row[2], cgst: acc.cgst + row[3],
      sgst: acc.sgst + row[4], total: acc.total + row[5], withGst: acc.withGst + row[6],
    }), { comm: 0, cgst: 0, sgst: 0, total: 0, withGst: 0 })
    commGstRows.push([])
    commGstRows.push(['TOTAL', '', r2(tot.comm), r2(tot.cgst), r2(tot.sgst), r2(tot.total), r2(tot.withGst)])
  }

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(commGstRows), 'Service GST 18%')

  // ── Write file ───────────────────────────────────────────────────────────────
  const filename = month === 'all'
    ? 'Zordr_Q1_Finance.xlsx'
    : `Zordr_${month}_Finance.xlsx`

  XLSX.writeFile(wb, filename)
}
