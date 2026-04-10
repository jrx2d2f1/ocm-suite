'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, ChevronLeft, X, Trash2, Plus, Pencil, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { upsertCustomer, deleteCustomer } from '@/lib/actions/customers'
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

const inputCls = 'w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 placeholder:text-muted-foreground/50 transition-colors hover:bg-white/[0.07]'

// ── Local types ───────────────────────────────────────────────────
interface FlatCustomer { id: string; name: string; parent_id: string | null; acct_type: string | null }
interface CustEdit { id?: string; name: string; parent_id: string | null; acct_type: string }

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
type GroupRow = { kind: 'group';    id: string; name: string; hasSubCustomers: boolean }
type CustRow  = { kind: 'customer'; id: string; name: string; hasEngagements: boolean }
type EngRow   = { kind: 'eng';  eng: GanttEngagement; indent: number }
// One row per engagement that has milestones — all milestones rendered together
type MsRow    = { kind: 'ms'; engId: string; milestones: GanttMilestone[]; indent: number }
type Row = GroupRow | CustRow | EngRow | MsRow

function buildRows(groups: GanttGroup[], collapsed: Set<string>): Row[] {
  const rows: Row[] = []
  for (const g of groups) {
    const hasSubCustomers = !(g.customers.length === 1 && g.customers[0].id === g.id)
    rows.push({ kind: 'group', id: g.id, name: g.name, hasSubCustomers })
    if (collapsed.has(g.id)) continue

    const showCustRow = hasSubCustomers
    for (const c of g.customers) {
      const hasEngagements = c.engagements.length > 0
      if (showCustRow) rows.push({ kind: 'customer', id: c.id, name: c.name, hasEngagements })
      // Skip engagement/milestone rows if this customer is collapsed
      if (collapsed.has(c.id)) continue
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

// ── CustomerPanel (slide-over) ────────────────────────────────────
const ACCT_TYPES = ['Gruppe', 'GmbH', 'AG', 'KGaA', 'SE', 'GmbH & Co. KG', 'Inc.', 'Corp.']

function CustomerPanel({
  edit,
  orgId,
  allCustomers,
  open,
  onClose,
}: {
  edit: CustEdit
  orgId: string
  allCustomers: FlatCustomer[]
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const isEditMode = !!edit.id

  const [name, setName]       = useState(edit.name)
  const [acctType, setAcctType] = useState(edit.acct_type)
  const [parentId, setParentId] = useState<string>(edit.parent_id ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Sync state when panel opens for a different customer
  useEffect(() => {
    setName(edit.name)
    setAcctType(edit.acct_type)
    setParentId(edit.parent_id ?? '')
    setError(null)
  }, [edit.id, edit.parent_id, open]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave() {
    if (!name.trim()) { setError('Name ist ein Pflichtfeld.'); return }
    setError(null)
    startTransition(async () => {
      try {
        await upsertCustomer({
          id: edit.id,
          org_id: orgId,
          name: name.trim(),
          parent_id: parentId || null,
          acct_type: acctType || null,
        })
        router.refresh()
        onClose()
      } catch (e: any) {
        setError(e.message ?? 'Fehler beim Speichern.')
      }
    })
  }

  function handleDelete() {
    if (!edit.id) return
    startTransition(async () => {
      try {
        await deleteCustomer(edit.id!)
        router.refresh()
        onClose()
      } catch (e: any) {
        setError(e.message ?? 'Fehler beim Löschen.')
      }
    })
  }

  // Only top-level customers (parent_id is null) can be chosen as parent,
  // and a customer can't be its own parent
  const parentOptions = allCustomers.filter(c => c.parent_id === null && c.id !== edit.id)

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/30 backdrop-blur-[2px] transition-opacity',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        className={cn(
          'fixed right-0 top-0 z-40 flex h-screen w-[400px] flex-col',
          'border-l border-white/10 bg-background/90 backdrop-blur-xl',
          'shadow-[-8px_0_32px_rgba(0,0,0,0.3)]',
          'transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-white/[0.03] shrink-0">
          <h2 className="text-sm font-semibold">
            {isEditMode ? 'Kunde bearbeiten' : 'Neuer Kunde'}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-white/10 transition-colors"
            aria-label="Schließen"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Name <span className="text-rose-400">*</span>
            </label>
            <input
              className={inputCls}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Kundenname"
            />
          </div>

          {/* Typ */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Typ</label>
            <select
              className={inputCls}
              value={acctType}
              onChange={e => setAcctType(e.target.value)}
            >
              <option value="">— Kein Typ —</option>
              {ACCT_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Übergeordneter Kunde */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Übergeordneter Kunde</label>
            <select
              className={inputCls}
              value={parentId}
              onChange={e => setParentId(e.target.value)}
            >
              <option value="">— Kein übergeordneter Kunde —</option>
              {parentOptions.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-5 py-4 flex items-center gap-3 bg-white/[0.02] shrink-0">
          {isEditMode && (
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Löschen
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
              Abbrechen
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              {isPending ? 'Speichert…' : 'Speichern'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Component ─────────────────────────────────────────────────────
interface Props {
  groups: GanttGroup[]
  initialYear: number
  orgId: string
  allCustomers: FlatCustomer[]
}

export function GanttChart({ groups, initialYear, orgId, allCustomers }: Props) {
  const router = useRouter()
  const [year, setYear]           = useState(initialYear)
  const [period, setPeriod]       = useState<PeriodKey>('year')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [custPanelOpen, setCustPanelOpen] = useState(false)
  const [custPanelEdit, setCustPanelEdit] = useState<CustEdit>({ name: '', parent_id: null, acct_type: '' })

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

  function findCustomer(id: string): CustEdit {
    const c = allCustomers.find(x => x.id === id)
    return { id, name: c?.name ?? '', parent_id: c?.parent_id ?? null, acct_type: c?.acct_type ?? '' }
  }

  function openCustPanel(edit: CustEdit) {
    setCustPanelEdit(edit)
    setCustPanelOpen(true)
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
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-teal/60" />
            Heute
          </span>
        )}

        <button
          onClick={() => openCustPanel({ name: '', parent_id: null, acct_type: '' })}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
        >
          <Plus className="h-3 w-3" /> Neuer Kunde
        </button>
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
                      className="sticky left-0 z-10 shrink-0 bg-bg-mid/60 border-r border-white/10 flex items-center gap-1.5 px-2 select-none group"
                      style={{ width: LABEL_W }}
                    >
                      {/* Collapse toggle */}
                      <button
                        onClick={() => toggle(row.id)}
                        className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer hover:text-foreground transition-colors"
                      >
                        {open
                          ? <ChevronDown  className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        }
                        <span className="text-sm font-semibold truncate">{row.name}</span>
                      </button>
                      {/* Action buttons — visible on hover */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => router.push('/strategy?customer=' + row.id)}
                          title="Ziele anzeigen"
                          className="p-1 rounded hover:bg-white/10 transition-colors"
                        >
                          <Target className="h-3 w-3 text-muted-foreground" />
                        </button>
                        {row.hasSubCustomers && (
                          <button
                            onClick={() => openCustPanel({ name: '', parent_id: row.id, acct_type: '' })}
                            title="Untergeordneten Kunden hinzufügen"
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                          >
                            <Plus className="h-3 w-3 text-muted-foreground" />
                          </button>
                        )}
                        <button
                          onClick={() => openCustPanel(findCustomer(row.id))}
                          title="Kunde bearbeiten"
                          className="p-1 rounded hover:bg-white/10 transition-colors"
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                    <div className="relative flex-1"><TimelineBg shade /></div>
                  </div>
                )
              }

              // ── Customer row ───────────────────────────────────
              if (row.kind === 'customer') {
                const custOpen = !collapsed.has(row.id)
                return (
                  <div key={`c-${row.id}`} className="flex border-b border-white/5" style={{ height: ROW_H }}>
                    <div
                      className="sticky left-0 z-10 shrink-0 bg-background border-r border-white/10 flex items-center pr-2 select-none group"
                      style={{ width: LABEL_W }}
                    >
                      {/* Collapse chevron — only shown if customer has engagements */}
                      {row.hasEngagements ? (
                        <button
                          onClick={() => toggle(row.id)}
                          className="pl-5 pr-1 flex items-center cursor-pointer hover:text-foreground transition-colors"
                          aria-label={custOpen ? 'Einklappen' : 'Ausklappen'}
                        >
                          {custOpen
                            ? <ChevronDown  className="h-3 w-3 shrink-0 text-muted-foreground" />
                            : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                          }
                        </button>
                      ) : (
                        <span className="pl-7" />
                      )}
                      <span
                        className={cn(
                          'text-xs font-medium truncate flex-1 min-w-0',
                          row.hasEngagements ? 'text-muted-foreground' : 'text-muted-foreground/50'
                        )}
                      >
                        {row.name}
                      </span>
                      {/* Action buttons — visible on hover */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => router.push('/strategy?customer=' + row.id)}
                          title="Ziele anzeigen"
                          className="p-1 rounded hover:bg-white/10 transition-colors"
                        >
                          <Target className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => openCustPanel(findCustomer(row.id))}
                          title="Kunde bearbeiten"
                          className="p-1 rounded hover:bg-white/10 transition-colors"
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
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
              const hiddenMs = milestones.filter(ms => {
                const f = ms.due ? frac(new Date(ms.due)) : null
                return f === null || f < -0.02 || f > 1.02
              })
              return (
                <div key={`ms-${row.engId}`} className="flex border-b border-white/5" style={{ height: MS_ROW_H }}>
                  {/* Left label column — shows hidden milestone count if any */}
                  <div
                    className="sticky left-0 z-10 shrink-0 bg-background border-r border-white/10 flex items-center justify-end pr-2"
                    style={{ width: LABEL_W }}
                  >
                    {hiddenMs.length > 0 && (
                      <span
                        className="text-[9px] text-muted-foreground/40 tabular-nums"
                        title={hiddenMs.map(ms => `${ms.name} (${ms.due})`).join('\n')}
                      >
                        +{hiddenMs.length} außerhalb
                      </span>
                    )}
                  </div>

                  {/* Timeline — all milestones side by side */}
                  <div className="relative flex-1 overflow-hidden">
                    <TimelineBg />
                    {milestones.map(ms => {
                      const msF = ms.due ? frac(new Date(ms.due)) : null
                      if (msF === null || msF < -0.02 || msF > 1.02) return null
                      const msColor = ms.color ?? MS_COLOR[ms.status] ?? MS_COLOR.planned
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
                Keine Kunden vorhanden.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customer slide-over panel */}
      <CustomerPanel
        edit={custPanelEdit}
        orgId={orgId}
        allCustomers={allCustomers}
        open={custPanelOpen}
        onClose={() => setCustPanelOpen(false)}
      />
    </div>
  )
}
