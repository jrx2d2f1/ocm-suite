'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type GanttGroup,
  type GanttEngagement,
  type PeriodKey,
  PERIOD_MONTHS,
  MONTHS_DE,
  MILESTONE_DOT,
  ENGAGEMENT_BAR,
} from './types'

// ── Layout constants ──────────────────────────────────────────────
const LABEL_W  = 224   // px — sticky left column
const MONTH_W  = 90    // px — each month column
const ROW_H    = 40    // px — every row (group / customer / engagement)

// ── Helpers ───────────────────────────────────────────────────────
/** First day of a 'YYYY-MM' month string. */
function ymToDate(ym: string): Date {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

/** First day of the month AFTER a 'YYYY-MM' string (exclusive end). */
function ymToDateExclusive(ym: string): Date {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 1)
}

// ── Row types ─────────────────────────────────────────────────────
type GroupRow  = { kind: 'group';    id: string; name: string }
type CustRow   = { kind: 'customer'; id: string; name: string }
type EngRow    = { kind: 'eng'; eng: GanttEngagement; indent: number }
type Row = GroupRow | CustRow | EngRow

function buildRows(groups: GanttGroup[], collapsed: Set<string>): Row[] {
  const rows: Row[] = []
  for (const g of groups) {
    rows.push({ kind: 'group', id: g.id, name: g.name })
    if (collapsed.has(g.id)) continue

    // If the group IS the only customer (standalone), skip the customer row
    const showCustRow = !(g.customers.length === 1 && g.customers[0].id === g.id)
    for (const c of g.customers) {
      if (showCustRow) {
        rows.push({ kind: 'customer', id: c.id, name: c.name })
      }
      for (const eng of c.engagements) {
        rows.push({ kind: 'eng', eng, indent: showCustRow ? 2 : 1 })
      }
    }
  }
  return rows
}

// ── Component ─────────────────────────────────────────────────────
interface Props {
  groups: GanttGroup[]
  initialYear: number
}

export function GanttChart({ groups, initialYear }: Props) {
  const [year, setYear]           = useState(initialYear)
  const [period, setPeriod]       = useState<PeriodKey>('year')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  // Date range for the selected period
  const months     = PERIOD_MONTHS[period]
  const rangeStart = new Date(year, months[0] - 1, 1)
  const rangeEnd   = new Date(year, months[months.length - 1], 1)   // exclusive
  const totalMs    = rangeEnd.getTime() - rangeStart.getTime()
  const timelineW  = months.length * MONTH_W

  /** Fraction [0,1] of `date` within the current range. */
  function frac(date: Date): number {
    return (date.getTime() - rangeStart.getTime()) / totalMs
  }

  const todayFrac = frac(new Date())
  const showToday = todayFrac >= 0 && todayFrac <= 1

  function toggle(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const rows = buildRows(groups, collapsed)

  // ── Shared timeline backdrop ────────────────────────────────────
  function TimelineBg({ shade }: { shade?: boolean }) {
    return (
      <>
        {months.map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-r border-border/40"
            style={{ left: i * MONTH_W, width: MONTH_W }}
          />
        ))}
        {showToday && (
          <div
            className="absolute top-0 bottom-0 w-px bg-primary/60 z-20"
            style={{ left: `${todayFrac * 100}%` }}
          />
        )}
        {shade && <div className="absolute inset-0 bg-muted/20" />}
      </>
    )
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">

      {/* Controls */}
      <div className="flex items-center gap-3 shrink-0 flex-wrap">
        {/* Year navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setYear(y => y - 1)}
            className="p-1 rounded hover:bg-muted transition-colors"
            aria-label="Vorjahr"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold w-12 text-center tabular-nums">{year}</span>
          <button
            onClick={() => setYear(y => y + 1)}
            className="p-1 rounded hover:bg-muted transition-colors rotate-180"
            aria-label="Nächstes Jahr"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="h-4 border-l border-border" />

        {/* Period buttons */}
        {(['Q1', 'Q2', 'Q3', 'Q4', 'H1', 'H2', 'year'] as PeriodKey[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'px-2.5 py-1 rounded text-xs font-medium transition-colors',
              period === p
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
          >
            {p === 'year' ? 'Jahr' : p}
          </button>
        ))}

        {/* Today indicator */}
        {showToday && (
          <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-primary/60" />
            Heute
          </span>
        )}
      </div>

      {/* Gantt grid */}
      <div className="flex-1 min-h-0 border rounded-lg overflow-auto">
        {/* Inner container — min-width forces scroll when narrow */}
        <div style={{ minWidth: LABEL_W + timelineW }}>

          {/* ── Header ── */}
          <div
            className="sticky top-0 z-30 flex border-b bg-background"
            style={{ height: ROW_H }}
          >
            {/* Corner */}
            <div
              className="sticky left-0 z-40 shrink-0 bg-background border-r flex items-center px-3"
              style={{ width: LABEL_W }}
            >
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Projekt
              </span>
            </div>

            {/* Month labels */}
            <div className="flex shrink-0" style={{ width: timelineW }}>
              {months.map(m => (
                <div
                  key={m}
                  className="flex items-center justify-center border-r last:border-r-0 text-xs font-medium text-muted-foreground"
                  style={{ width: MONTH_W }}
                >
                  {MONTHS_DE[m - 1]}
                </div>
              ))}
            </div>
          </div>

          {/* ── Body rows ── */}
          {rows.map((row, idx) => {

            if (row.kind === 'group') {
              const open = !collapsed.has(row.id)
              return (
                <div key={`g-${row.id}`} className="flex border-b" style={{ height: ROW_H }}>
                  <div
                    className="sticky left-0 z-10 shrink-0 bg-muted/40 border-r flex items-center gap-1.5 px-2 cursor-pointer hover:bg-muted/60 select-none"
                    style={{ width: LABEL_W }}
                    onClick={() => toggle(row.id)}
                  >
                    {open
                      ? <ChevronDown  className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    }
                    <span className="text-sm font-semibold truncate">{row.name}</span>
                  </div>
                  <div className="relative shrink-0" style={{ width: timelineW }}>
                    <TimelineBg shade />
                  </div>
                </div>
              )
            }

            if (row.kind === 'customer') {
              return (
                <div key={`c-${row.id}`} className="flex border-b" style={{ height: ROW_H }}>
                  <div
                    className="sticky left-0 z-10 shrink-0 bg-background border-r flex items-center pl-7 pr-2"
                    style={{ width: LABEL_W }}
                  >
                    <span className="text-xs font-medium text-muted-foreground truncate">{row.name}</span>
                  </div>
                  <div className="relative shrink-0" style={{ width: timelineW }}>
                    <TimelineBg />
                  </div>
                </div>
              )
            }

            // ── Engagement row ──────────────────────────────────
            const { eng, indent } = row
            const startFrac = eng.start_date ? frac(ymToDate(eng.start_date)) : null
            const endFrac   = eng.end_date   ? frac(ymToDateExclusive(eng.end_date)) : null

            const barL = startFrac !== null ? Math.max(0, startFrac) * 100 : null
            const barR = endFrac   !== null ? Math.min(1, endFrac)   * 100 : null
            const barW = barL !== null && barR !== null ? barR - barL : null
            const showBar = barW !== null && barW > 0

            return (
              <div key={`e-${eng.id}`} className="flex border-b" style={{ height: ROW_H }}>
                <div
                  className="sticky left-0 z-10 shrink-0 bg-background border-r flex items-center pr-2"
                  style={{ width: LABEL_W, paddingLeft: indent === 2 ? 40 : 24 }}
                >
                  <span className="text-xs truncate" title={eng.name}>
                    {eng.eng_alias ?? eng.name}
                  </span>
                </div>

                <div className="relative shrink-0" style={{ width: timelineW }}>
                  <TimelineBg />

                  {/* Engagement bar */}
                  {showBar && (
                    <div
                      className={cn(
                        'absolute top-1/2 -translate-y-1/2 h-5 rounded z-10',
                        ENGAGEMENT_BAR[eng.status]
                      )}
                      style={{ left: `${barL}%`, width: `${barW}%` }}
                      title={`${eng.name} · ${eng.status}`}
                    />
                  )}

                  {/* Milestone dots */}
                  {eng.milestones.map(ms => {
                    if (!ms.due) return null
                    const f = frac(new Date(ms.due))
                    if (f < -0.02 || f > 1.02) return null
                    return (
                      <div
                        key={ms.id}
                        className={cn(
                          'absolute top-1/2 w-3 h-3 rounded-full z-20 ring-2 ring-background',
                          MILESTONE_DOT[ms.status]
                        )}
                        style={{
                          left: `${f * 100}%`,
                          transform: 'translateX(-50%) translateY(-50%)',
                        }}
                        title={`${ms.name} · ${ms.due} · ${ms.status}`}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Empty state */}
          {rows.length === 0 && (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              Keine Engagements vorhanden.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
