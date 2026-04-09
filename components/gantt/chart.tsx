'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type GanttGroup,
  type GanttEngagement,
  type GanttMilestone,
  type PeriodKey,
  PERIOD_MONTHS,
  MONTHS_DE,
  ENGAGEMENT_BAR,
  ENGAGEMENT_STATUS_LABEL,
} from './types'

// ── Layout constants ──────────────────────────────────────────────
const LABEL_W  = 224   // px — sticky left column (fixed)
const ROW_H    = 40    // px — group / customer / engagement rows
const MS_ROW_H = 56    // px — milestone row: diamond + label below

const MS_COLOR: Record<string, string> = {
  planned:  '#a1a1aa',
  progress: '#38bdf8',
  done:     '#10b981',
  delayed:  '#f43f5e',
}

// ── Helpers ───────────────────────────────────────────────────────
function ymToDate(ym: string): Date {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

function ymToDateExclusive(ym: string): Date {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 1)
}

// ── Row types ─────────────────────────────────────────────────────
type GroupRow = { kind: 'group';    id: string; name: string }
type CustRow  = { kind: 'customer'; id: string; name: string }
type EngRow   = { kind: 'eng';  eng: GanttEngagement; indent: number }
// One row per engagement that has milestones — all milestones rendered together
type MsRow    = { kind: 'ms'; engId: string; milestones: GanttMilestone[]; indent: number }
type Row = GroupRow | CustRow | EngRow | MsRow

function buildRows(groups: GanttGroup[], collapsed: Set<string>): Row[] {
  const rows: Row[] = []
  for (const g of groups) {
    rows.push({ kind: 'group', id: g.id, name: g.name })
    if (collapsed.has(g.id)) continue

    const showCustRow = !(g.customers.length === 1 && g.customers[0].id === g.id)
    for (const c of g.customers) {
      if (showCustRow) rows.push({ kind: 'customer', id: c.id, name: c.name })
      for (const eng of c.engagements) {
        const engIndent = showCustRow ? 2 : 1
        rows.push({ kind: 'eng', eng, indent: engIndent })
        if (eng.milestones.length > 0) {
          rows.push({ kind: 'ms', engId: eng.id, milestones: eng.milestones, indent: engIndent })
        }
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
  const router = useRouter()
  const [year, setYear]           = useState(initialYear)
  const [period, setPeriod]       = useState<PeriodKey>('year')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const months     = PERIOD_MONTHS[period]
  const n          = months.length
  const rangeStart = new Date(year, months[0] - 1, 1)
  const rangeEnd   = new Date(year, months[months.length - 1], 1)
  const totalMs    = rangeEnd.getTime() - rangeStart.getTime()

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

  // ── Timeline backdrop — percentage-based so it scales with flex-1 ──
  function TimelineBg({ shade }: { shade?: boolean }) {
    return (
      <>
        {months.map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-r border-white/5"
            style={{ left: `${(i / n) * 100}%`, width: `${100 / n}%` }}
          />
        ))}
        {showToday && (
          <div
            className="absolute top-0 bottom-0 w-px bg-teal/70 z-20"
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

        <div className="h-4 border-l border-white/10" />

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

        {showToday && (
          <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-teal/60" />
            Heute
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground shrink-0">
        <span className="font-medium text-foreground/50 uppercase tracking-wide text-[10px]">Initiativen</span>
        {(['active', 'draft', 'hold', 'closed'] as const).map(s => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn('inline-block h-2.5 w-6 rounded-sm', ENGAGEMENT_BAR[s])} />
            {ENGAGEMENT_STATUS_LABEL[s]}
          </span>
        ))}
        <span className="border-l border-white/10 h-3 mx-1" />
        <span className="font-medium text-foreground/50 uppercase tracking-wide text-[10px]">Meilensteine</span>
        {([
          { status: 'done',     label: 'Erreicht',       color: MS_COLOR.done },
          { status: 'progress', label: 'In Bearbeitung', color: MS_COLOR.progress },
          { status: 'delayed',  label: 'Verzögert',      color: MS_COLOR.delayed },
          { status: 'planned',  label: 'Geplant',        color: MS_COLOR.planned },
        ] as const).map(({ status, label, color }) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[1px]" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>

      {/* Gantt grid */}
      <div className="flex-1 min-h-0 border border-white/10 rounded-lg overflow-auto">
        <div className="w-full h-full flex flex-col">

          {/* ── Header ── */}
          <div
            className="sticky top-0 z-30 flex border-b border-white/10 bg-background/95 backdrop-blur-sm shrink-0"
            style={{ height: ROW_H }}
          >
            <div
              className="sticky left-0 z-40 shrink-0 bg-background/95 border-r border-white/10 flex items-center px-3"
              style={{ width: LABEL_W }}
            >
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Projekt</span>
            </div>
            <div className="flex flex-1">
              {months.map(m => (
                <div
                  key={m}
                  className="flex flex-1 items-center justify-center border-r border-white/5 last:border-r-0 text-xs font-medium text-muted-foreground"
                >
                  {MONTHS_DE[m - 1]}
                </div>
              ))}
            </div>
          </div>

          {/* ── Body rows ── */}
          <div className="flex-1">
            {rows.map((row) => {

              // ── Group row ──────────────────────────────────────
              if (row.kind === 'group') {
                const open = !collapsed.has(row.id)
                return (
                  <div key={`g-${row.id}`} className="flex border-b border-white/5" style={{ height: ROW_H }}>
                    <div
                      className="sticky left-0 z-10 shrink-0 bg-bg-mid/60 border-r border-white/10 flex items-center gap-1.5 px-2 cursor-pointer hover:bg-bg-mid/80 select-none"
                      style={{ width: LABEL_W }}
                      onClick={() => toggle(row.id)}
                    >
                      {open
                        ? <ChevronDown  className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      }
                      <span className="text-sm font-semibold truncate">{row.name}</span>
                    </div>
                    <div className="relative flex-1"><TimelineBg shade /></div>
                  </div>
                )
              }

              // ── Customer row ───────────────────────────────────
              if (row.kind === 'customer') {
                return (
                  <div key={`c-${row.id}`} className="flex border-b border-white/5" style={{ height: ROW_H }}>
                    <div
                      className="sticky left-0 z-10 shrink-0 bg-background border-r border-white/10 flex items-center pl-7 pr-2"
                      style={{ width: LABEL_W }}
                    >
                      <span className="text-xs font-medium text-muted-foreground truncate">{row.name}</span>
                    </div>
                    <div className="relative flex-1"><TimelineBg /></div>
                  </div>
                )
              }

              // ── Engagement row ─────────────────────────────────
              if (row.kind === 'eng') {
                const { eng, indent } = row
                const startFrac = eng.start_date ? frac(ymToDate(eng.start_date)) : null
                const endFrac   = eng.end_date   ? frac(ymToDateExclusive(eng.end_date)) : null
                const barL = startFrac !== null ? Math.max(0, startFrac) * 100 : null
                const barR = endFrac   !== null ? Math.min(1, endFrac)   * 100 : null
                const barW = barL !== null && barR !== null ? barR - barL : null
                const showBar = barW !== null && barW > 0

                return (
                  <div key={`e-${eng.id}`} className="flex border-b border-white/5" style={{ height: ROW_H }}>
                    <div
                      className="sticky left-0 z-10 shrink-0 bg-background border-r border-white/10 flex items-center pr-2 cursor-pointer hover:bg-muted/20 transition-colors group"
                      style={{ width: LABEL_W, paddingLeft: indent === 2 ? 40 : 24 }}
                      onClick={() => router.push(`/canvas?engagement=${eng.id}`)}
                    >
                      <span className="text-xs truncate group-hover:text-foreground transition-colors" title={eng.name}>
                        {eng.eng_alias ?? eng.name}
                      </span>
                    </div>
                    <div className="relative flex-1">
                      <TimelineBg />
                      {showBar && (
                        <div
                          className={cn(
                            'absolute top-1/2 -translate-y-1/2 h-5 rounded z-10 cursor-pointer hover:brightness-125 transition-all',
                            ENGAGEMENT_BAR[eng.status]
                          )}
                          style={{ left: `${barL}%`, width: `${barW}%` }}
                          title={`${eng.name} · ${ENGAGEMENT_STATUS_LABEL[eng.status]} → Canvas öffnen`}
                          onClick={() => router.push(`/canvas?engagement=${eng.id}`)}
                        />
                      )}
                    </div>
                  </div>
                )
              }

              // ── Milestone row — all milestones in one row, label below diamond ──
              const { milestones, indent } = row
              return (
                <div key={`ms-${row.engId}`} className="flex border-b border-white/5" style={{ height: MS_ROW_H }}>
                  {/* Empty left label column — keeps grid alignment */}
                  <div
                    className="sticky left-0 z-10 shrink-0 bg-background border-r border-white/10"
                    style={{ width: LABEL_W }}
                  />

                  {/* Timeline — all milestones side by side */}
                  <div className="relative flex-1 overflow-hidden">
                    <TimelineBg />
                    {milestones.map(ms => {
                      const msF = ms.due ? frac(new Date(ms.due)) : null
                      if (msF === null || msF < -0.02 || msF > 1.02) return null
                      const msColor = MS_COLOR[ms.status] ?? MS_COLOR.planned
                      const pct = Math.max(0, Math.min(100, msF * 100))

                      return (
                        <div
                          key={ms.id}
                          className="absolute top-0 flex flex-col items-center z-20 pointer-events-none"
                          style={{ left: `${pct}%`, transform: 'translateX(-50%)', paddingTop: 7 }}
                          title={`${ms.name} · ${ms.due}`}
                        >
                          {/* Diamond */}
                          <span
                            className="block w-3.5 h-3.5 rotate-45 rounded-[2px] shrink-0"
                            style={{
                              backgroundColor: msColor,
                              boxShadow: `0 0 0 2px #1E2B32, 0 0 6px ${msColor}60`,
                            }}
                          />
                          {/* Label below */}
                          <span
                            className="mt-2 text-[9px] leading-tight text-center text-muted-foreground/80 line-clamp-2"
                            style={{ maxWidth: 72 }}
                          >
                            {ms.name}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {rows.length === 0 && (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                Keine Engagements vorhanden.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
