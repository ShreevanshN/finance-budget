import { useMemo, useState } from 'react'
import { MONTHS, formatINR, calcGmvBreakup } from '../constants.js'
import { Badge, MetricCard } from './UI.jsx'
import * as XLSX from 'xlsx'

// Round to 2 decimal places
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

function exportTableToExcel(rows, sheetName, filename) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename)
}

// ── Shared table shell ─────────────────────────────────────────────────────────
function SectionTable({ title, subtitle, onExport, columns, children, footerRow }) {
  return (
    <div style={{
      background: 'var(--bg1)', border: '0.5px solid var(--border)',
      borderRadius: 12, overflow: 'hidden', marginBottom: 20,
    }}>
      <div style={{
        padding: '14px 20px', borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
          {subtitle && <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 12, marginLeft: 8 }}>{subtitle}</span>}
        </div>
        <button
          onClick={onExport}
          style={{
            padding: '5px 12px', fontSize: 11, fontWeight: 500,
            border: '0.5px solid var(--border)', borderRadius: 6,
            background: 'var(--bg2)', color: 'var(--text2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >↓ Export Excel</button>
      </div>

      {/* Header row */}
      <div style={{
        display: 'grid', gridTemplateColumns: columns.map(c => c.w).join(' '),
        padding: '8px 20px', fontSize: 10, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
        borderBottom: '0.5px solid var(--border)', background: 'var(--bg2)',
      }}>
        {columns.map(c => <span key={c.key} style={{ textAlign: c.align || 'left' }}>{c.label}</span>)}
      </div>

      {children}

      {/* Footer totals row */}
      {footerRow && (
        <div style={{
          display: 'grid', gridTemplateColumns: columns.map(c => c.w).join(' '),
          padding: '11px 20px', fontSize: 12, fontWeight: 700,
          background: 'var(--bg2)', borderTop: '1px solid var(--border)',
        }}>
          {footerRow.map((cell, i) => (
            <span key={i} style={{ textAlign: columns[i]?.align || 'left', color: cell?.color || 'var(--text1)' }}>
              {cell?.value ?? cell ?? ''}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function DataRow({ columns, cells }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: columns.map(c => c.w).join(' '),
      padding: '11px 20px', borderBottom: '0.5px solid var(--border)',
      fontSize: 12, alignItems: 'center',
    }}>
      {cells.map((cell, i) => (
        <span key={i} style={{ textAlign: columns[i]?.align || 'left', color: cell?.color || 'inherit', fontWeight: cell?.bold ? 600 : 'inherit' }}>
          {cell?.value ?? cell ?? ''}
        </span>
      ))}
    </div>
  )
}

export default function GmvSettlementsTab({ allData, colleges }) {
  const [activeMonth, setActiveMonth] = useState('all')
  const monthsToShow = activeMonth === 'all' ? MONTHS : MONTHS.filter(m => m.id === activeMonth)
  const monthLabel = activeMonth === 'all' ? 'All Months' : MONTHS.find(m => m.id === activeMonth)?.label

  // ── Per-college breakdown ──────────────────────────────────────────────────
  const breakdown = useMemo(() => {
    return colleges.map(col => {
      const monthly = {}
      let totals = { gmv: 0, foodValue: 0, foodGST: 0, zordrCommission: 0, commissionGST: 0, vendorPayout: 0 }

      MONTHS.forEach(({ id: mId, label }) => {
        const days = Object.values(allData[mId] || {})
        let m = { gmv: 0, foodValue: 0, foodGST: 0, zordrCommission: 0, commissionGST: 0, vendorPayout: 0 }
        days.forEach(day => {
          const gmvVal = day.gmv?.[col.id] || 0
          if (parseFloat(gmvVal) > 0) {
            const b = calcGmvBreakup(gmvVal, col.commission ?? 2.5)
            m.gmv             += b.gmv
            m.foodValue       += b.foodValue
            m.foodGST         += b.foodGST
            m.zordrCommission += b.zordrCommission
            m.commissionGST   += b.commissionGST
            m.vendorPayout    += b.vendorPayout
          }
        })
        monthly[mId] = { ...m, label }
        Object.keys(totals).forEach(k => { totals[k] += m[k] })
      })

      return { ...col, monthly, totals }
    })
  }, [allData, colleges])

  // ── Grand totals across visible months ────────────────────────────────────
  const grandTotals = useMemo(() => {
    const t = { gmv: 0, foodValue: 0, foodGST: 0, zordrCommission: 0, commissionGST: 0, vendorPayout: 0 }
    breakdown.forEach(col => {
      monthsToShow.forEach(({ id: mId }) => {
        const m = col.monthly[mId]
        Object.keys(t).forEach(k => { t[k] += m[k] })
      })
    })
    // Round all totals to 2dp
    Object.keys(t).forEach(k => { t[k] = r2(t[k]) })
    return t
  }, [breakdown, monthsToShow])

  // ── Per-college aggregated (for visible months) ───────────────────────────
  const collegeAggs = useMemo(() => {
    return breakdown.map(col => {
      const agg = { gmv: 0, foodValue: 0, foodGST: 0, zordrCommission: 0, commissionGST: 0, vendorPayout: 0 }
      monthsToShow.forEach(({ id: mId }) => {
        const m = col.monthly[mId]
        Object.keys(agg).forEach(k => { agg[k] += m[k] })
      })
      Object.keys(agg).forEach(k => { agg[k] = r2(agg[k]) })
      return { ...col, agg }
    })
  }, [breakdown, monthsToShow])

  // ── Columns definitions ───────────────────────────────────────────────────
  const gmvCols = [
    { key: 'college', label: 'College', w: '1.6fr' },
    { key: 'type', label: 'Type', w: '0.7fr' },
    { key: 'comm', label: 'Comm %', w: '0.7fr', align: 'right' },
    { key: 'gmv', label: 'GMV (incl. 5% GST)', w: '1.1fr', align: 'right' },
    { key: 'foodValue', label: 'Food Value (ex-GST)', w: '1.1fr', align: 'right' },
    { key: 'vendorPayout', label: 'Vendor Payout', w: '1.1fr', align: 'right' },
  ]

  const foodGstCols = [
    { key: 'college', label: 'College', w: '1.6fr' },
    { key: 'gmv', label: 'GMV (incl. GST)', w: '1fr', align: 'right' },
    { key: 'foodValue', label: 'Taxable Value', w: '1fr', align: 'right' },
    { key: 'cgst', label: 'CGST 2.5%', w: '1fr', align: 'right' },
    { key: 'sgst', label: 'SGST 2.5%', w: '1fr', align: 'right' },
    { key: 'foodGST', label: 'Total 5% GST', w: '1fr', align: 'right' },
  ]

  const commGstCols = [
    { key: 'college', label: 'College', w: '1.6fr' },
    { key: 'commission', label: 'Commission (excl. GST)', w: '1fr', align: 'right' },
    { key: 'cgst', label: 'CGST 9%', w: '1fr', align: 'right' },
    { key: 'sgst', label: 'SGST 9%', w: '1fr', align: 'right' },
    { key: 'commissionGST', label: 'Total 18% GST', w: '1fr', align: 'right' },
    { key: 'totalPayable', label: 'Total w/ GST', w: '1fr', align: 'right' },
  ]

  // ── Excel exports ─────────────────────────────────────────────────────────
  const exportGMV = () => {
    const rows = [
      ['College', 'Type', 'Commission %', 'GMV (incl. 5% GST)', 'Food Value (ex-GST)', 'Vendor Payout'],
    ]
    collegeAggs.forEach(col => {
      if (col.agg.gmv > 0) {
        rows.push([
          col.name,
          col.type === 'zordr_first' ? 'Zordr-first' : 'Normal',
          col.commission ?? 2.5,
          r2(col.agg.gmv),
          r2(col.agg.foodValue),
          r2(col.agg.vendorPayout),
        ])
      }
    })
    rows.push([])
    rows.push(['TOTAL', '', '', r2(grandTotals.gmv), r2(grandTotals.foodValue), r2(grandTotals.vendorPayout)])
    exportTableToExcel(rows, 'GMV & Revenue', `Zordr_GMV_${activeMonth}.xlsx`)
  }

  const exportFoodGST = () => {
    const rows = [
      ['Zordr Food Private Limited — Food GST Report (GSTR-1/3B)'],
      [`Period: ${monthLabel}`, '', 'GST Rate: 5% (CGST 2.5% + SGST 2.5%)'],
      [],
      ['College', 'GMV (incl. GST)', 'Taxable Value (Food ex-GST)', 'CGST @ 2.5%', 'SGST @ 2.5%', 'Total 5% Food GST'],
    ]
    collegeAggs.forEach(col => {
      if (col.agg.gmv > 0) {
        rows.push([
          col.name,
          r2(col.agg.gmv),
          r2(col.agg.foodValue),
          r2(col.agg.foodGST / 2),
          r2(col.agg.foodGST / 2),
          r2(col.agg.foodGST),
        ])
      }
    })
    rows.push([])
    rows.push([
      'TOTAL',
      r2(grandTotals.gmv),
      r2(grandTotals.foodValue),
      r2(grandTotals.foodGST / 2),
      r2(grandTotals.foodGST / 2),
      r2(grandTotals.foodGST),
    ])
    exportTableToExcel(rows, 'Food GST (5%)', `Zordr_FoodGST_${activeMonth}.xlsx`)
  }

  const exportCommGST = () => {
    const rows = [
      ['Zordr Food Private Limited — Service GST Report (GSTR-1/3B)'],
      [`Period: ${monthLabel}`, '', 'GST Rate: 18% on commission (CGST 9% + SGST 9%)'],
      [],
      ['College', 'Commission (excl. GST)', 'CGST @ 9%', 'SGST @ 9%', 'Total 18% GST', 'Total Commission + GST'],
    ]
    collegeAggs.forEach(col => {
      if (col.agg.zordrCommission > 0) {
        rows.push([
          col.name,
          r2(col.agg.zordrCommission),
          r2(col.agg.commissionGST / 2),
          r2(col.agg.commissionGST / 2),
          r2(col.agg.commissionGST),
          r2(col.agg.zordrCommission + col.agg.commissionGST),
        ])
      }
    })
    rows.push([])
    rows.push([
      'TOTAL',
      r2(grandTotals.zordrCommission),
      r2(grandTotals.commissionGST / 2),
      r2(grandTotals.commissionGST / 2),
      r2(grandTotals.commissionGST),
      r2(grandTotals.zordrCommission + grandTotals.commissionGST),
    ])
    exportTableToExcel(rows, 'Service GST (18%)', `Zordr_ServiceGST_${activeMonth}.xlsx`)
  }

  // ── Empty state helper ────────────────────────────────────────────────────
  const noDataRow = (
    <div style={{ padding: '20px', fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>
      No GMV logged for this period.
    </div>
  )

  return (
    <div style={{ paddingBottom: '2rem' }}>

      {/* Month filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveMonth('all')}
          style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
            border: '0.5px solid var(--border)',
            background: activeMonth === 'all' ? '#FE5500' : 'var(--bg2)',
            color: activeMonth === 'all' ? '#fff' : 'var(--text2)',
            fontWeight: activeMonth === 'all' ? 600 : 400,
          }}
        >All months</button>
        {MONTHS.map(m => (
          <button key={m.id} onClick={() => setActiveMonth(m.id)} style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
            border: '0.5px solid var(--border)',
            background: activeMonth === m.id ? '#FE5500' : 'var(--bg2)',
            color: activeMonth === m.id ? '#fff' : 'var(--text2)',
            fontWeight: activeMonth === m.id ? 600 : 400,
          }}>{m.label}</button>
        ))}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 24 }}>
        <MetricCard label="Total GMV" value={formatINR(grandTotals.gmv)} sub="gross sales (incl. 5% GST)" />
        <MetricCard label="Food value (ex-GST)" value={formatINR(grandTotals.foodValue)} sub="GMV ÷ 1.05" />
        <MetricCard label="5% Food GST" value={formatINR(grandTotals.foodGST)} sub="payable to govt" accent="#854F0B" />
        <MetricCard label="Zordr commission" value={formatINR(grandTotals.zordrCommission)} sub="Zordr net revenue" accent="#3B6D11" />
        <MetricCard label="18% Service GST" value={formatINR(grandTotals.commissionGST)} sub="payable to govt" accent="#854F0B" />
        <MetricCard label="Vendor payout" value={formatINR(grandTotals.vendorPayout)} sub="GMV − fees − GST" accent="#185FA5" />
      </div>

      {/* ── TABLE 1: GMV & Revenue ─────────────────────────────────────────────── */}
      <SectionTable
        title="GMV & Revenue"
        subtitle={`${monthLabel} · all colleges`}
        onExport={exportGMV}
        columns={gmvCols}
        footerRow={[
          { value: 'Total', bold: true },
          { value: '' },
          { value: '' },
          { value: formatINR(grandTotals.gmv), bold: true },
          { value: formatINR(grandTotals.foodValue) },
          { value: formatINR(grandTotals.vendorPayout), color: '#185FA5', bold: true },
        ]}
      >
        {collegeAggs.filter(c => c.agg.gmv > 0).length === 0 && noDataRow}
        {collegeAggs.filter(c => c.agg.gmv > 0).map(col => (
          <DataRow key={col.id} columns={gmvCols} cells={[
            {
              value: (
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{col.name}</div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 3 }}>
                    <Badge color={col.type === 'zordr_first' ? 'purple' : 'blue'}>
                      {col.type === 'zordr_first' ? 'ZF' : 'Normal'}
                    </Badge>
                    <Badge color="gray">{col.commission ?? 2.5}%</Badge>
                  </div>
                </div>
              )
            },
            { value: col.type === 'zordr_first' ? 'Zordr-first' : 'Normal', color: 'var(--text3)' },
            { value: `${col.commission ?? 2.5}%`, align: 'right' },
            { value: col.agg.gmv > 0 ? formatINR(r2(col.agg.gmv)) : '—', bold: true },
            { value: col.agg.foodValue > 0 ? formatINR(r2(col.agg.foodValue)) : '—', color: 'var(--text2)' },
            { value: col.agg.vendorPayout > 0 ? formatINR(r2(col.agg.vendorPayout)) : '—', color: '#185FA5', bold: true },
          ]} />
        ))}
      </SectionTable>

      {/* ── TABLE 2: Food GST (5%) ────────────────────────────────────────────── */}
      <SectionTable
        title="Food GST — 5%"
        subtitle={`${monthLabel} · CGST 2.5% + SGST 2.5% · for GSTR-1 / 3B`}
        onExport={exportFoodGST}
        columns={foodGstCols}
        footerRow={[
          { value: 'Total', bold: true },
          { value: formatINR(grandTotals.gmv), bold: true },
          { value: formatINR(grandTotals.foodValue) },
          { value: formatINR(r2(grandTotals.foodGST / 2)), color: '#854F0B' },
          { value: formatINR(r2(grandTotals.foodGST / 2)), color: '#854F0B' },
          { value: formatINR(grandTotals.foodGST), color: '#854F0B', bold: true },
        ]}
      >
        {collegeAggs.filter(c => c.agg.gmv > 0).length === 0 && noDataRow}
        {collegeAggs.filter(c => c.agg.gmv > 0).map(col => (
          <DataRow key={col.id} columns={foodGstCols} cells={[
            { value: <span style={{ fontWeight: 500 }}>{col.name}</span> },
            { value: formatINR(r2(col.agg.gmv)), color: 'var(--text1)' },
            { value: formatINR(r2(col.agg.foodValue)), color: 'var(--text2)' },
            { value: formatINR(r2(col.agg.foodGST / 2)), color: '#854F0B' },
            { value: formatINR(r2(col.agg.foodGST / 2)), color: '#854F0B' },
            { value: formatINR(r2(col.agg.foodGST)), color: '#854F0B', bold: true },
          ]} />
        ))}
      </SectionTable>

      {/* ── TABLE 3: Service GST (18%) ────────────────────────────────────────── */}
      <SectionTable
        title="Service GST — 18%"
        subtitle={`${monthLabel} · CGST 9% + SGST 9% · on Zordr commission`}
        onExport={exportCommGST}
        columns={commGstCols}
        footerRow={[
          { value: 'Total', bold: true },
          { value: formatINR(grandTotals.zordrCommission), color: '#3B6D11', bold: true },
          { value: formatINR(r2(grandTotals.commissionGST / 2)), color: '#854F0B' },
          { value: formatINR(r2(grandTotals.commissionGST / 2)), color: '#854F0B' },
          { value: formatINR(grandTotals.commissionGST), color: '#854F0B', bold: true },
          { value: formatINR(r2(grandTotals.zordrCommission + grandTotals.commissionGST)), bold: true },
        ]}
      >
        {collegeAggs.filter(c => c.agg.zordrCommission > 0).length === 0 && noDataRow}
        {collegeAggs.filter(c => c.agg.zordrCommission > 0).map(col => (
          <DataRow key={col.id} columns={commGstCols} cells={[
            { value: <span style={{ fontWeight: 500 }}>{col.name}</span> },
            { value: formatINR(r2(col.agg.zordrCommission)), color: '#3B6D11', bold: true },
            { value: formatINR(r2(col.agg.commissionGST / 2)), color: '#854F0B' },
            { value: formatINR(r2(col.agg.commissionGST / 2)), color: '#854F0B' },
            { value: formatINR(r2(col.agg.commissionGST)), color: '#854F0B', bold: true },
            { value: formatINR(r2(col.agg.zordrCommission + col.agg.commissionGST)), bold: true },
          ]} />
        ))}
      </SectionTable>

    </div>
  )
}
