'use client'

import { useState, useTransition, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Pencil, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FilterSelect } from '@/components/ui/filter-select'
import { saveCanvas } from '@/lib/actions/canvas'

// ── Types ─────────────────────────────────────────────────────────
type KpiAmpel = 'green' | 'yellow' | 'red' | 'gray'
type ZielTab   = 'org' | 'funktional' | 'people' | 'tech'

type CanvasPhase = {
  id: string; canvas_id: string
  title: string
  start_date: string | null; end_date: string | null
  dates_label: string | null; color: string | null
  description: string | null; goal: string | null
  sort_order: number
}
type CanvasKpi = {
  id: string; canvas_id: string; kr_id: string | null
  name: string; sub: string | null
  baseline: string | null; target_value: string | null; current_value: string | null
  methode: string | null; ampel: KpiAmpel; sort_order: number
}
export type Canvas = {
  id: string; engagement_id: string
  ausgangslage: string | null; strategischer_kontext: string | null
  treiber: string | null; risiken_bei_nicht_handeln: string | null
  ziele_org: string[]; ziele_funktional: string[]
  ziele_people: string[]; ziele_tech: string[]
  erfolg_narrativ: string | null
  canvas_phases: CanvasPhase[]
  canvas_kpis: CanvasKpi[]
}
export type Customer       = { id: string; name: string; parent_id: string | null }
export type EngagementMeta = { id: string; name: string; eng_alias: string | null; status: string; customer_id: string }

type PhaseForm = {
  id?: string
  title: string
  start_date: string | null; end_date: string | null
  dates_label: string | null; color: string | null
  description: string | null; goal: string | null
  sort_order: number
}
type KpiForm = {
  id?: string; kr_id?: string | null
  name: string; sub: string | null
  baseline: string | null; target_value: string | null; current_value: string | null
  methode: string | null; ampel: KpiAmpel; sort_order: number
}

type FormState = {
  ausgangslage: string; strategischer_kontext: string
  treiber: string; risiken_bei_nicht_handeln: string
  ziele_org: string[]; ziele_funktional: string[]
  ziele_people: string[]; ziele_tech: string[]
  erfolg_narrativ: string
  phases: PhaseForm[]; kpis: KpiForm[]
}

// ── Constants ─────────────────────────────────────────────────────
const ZIEL_TABS: { key: ZielTab; label: string; color: string }[] = [
  { key: 'org',        label: 'Organisation', color: 'text-sky-300' },
  { key: 'funktional', label: 'Funktionen',   color: 'text-violet-300' },
  { key: 'people',     label: 'Menschen',     color: 'text-emerald-300' },
  { key: 'tech',       label: 'Technologie',  color: 'text-teal' },
]
const ZIEL_KEY: Record<ZielTab, keyof Pick<FormState, 'ziele_org' | 'ziele_funktional' | 'ziele_people' | 'ziele_tech'>> = {
  org: 'ziele_org', funktional: 'ziele_funktional', people: 'ziele_people', tech: 'ziele_tech',
}
const METHODE_OPTIONS = [
  'Analytics-Dashboard', 'Puls-Survey', 'Meilenstein-Tracking',
  'Finance-Controlling', 'LMS-Tracking', 'Qual. Assessment / QBR',
  'NPS-Survey', 'Beobachtung', 'Interview', 'Sonstiges',
]
const AMPEL_DOT: Record<KpiAmpel, string> = {
  green:  'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]',
  yellow: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]',
  red:    'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]',
  gray:   'bg-zinc-500',
}
const AMPEL_LABEL: Record<KpiAmpel, string> = {
  gray: '–', green: 'Grün', yellow: 'Gelb', red: 'Rot',
}
const WARUM_BORDER: Record<string, string> = {
  ausgangslage:              '#f97316',  // orange-500
  strategischer_kontext:     '#38bdf8',  // sky-400
  treiber:                   '#fbbf24',  // amber-400
  risiken_bei_nicht_handeln: '#f43f5e',  // rose-500
}

// ── Helpers ───────────────────────────────────────────────────────
function initForm(canvas: Canvas | null): FormState {
  if (!canvas) {
    return {
      ausgangslage: '', strategischer_kontext: '', treiber: '', risiken_bei_nicht_handeln: '',
      ziele_org: [], ziele_funktional: [], ziele_people: [], ziele_tech: [],
      erfolg_narrativ: '', phases: [], kpis: [],
    }
  }
  return {
    ausgangslage:              canvas.ausgangslage ?? '',
    strategischer_kontext:     canvas.strategischer_kontext ?? '',
    treiber:                   canvas.treiber ?? '',
    risiken_bei_nicht_handeln: canvas.risiken_bei_nicht_handeln ?? '',
    ziele_org:        [...(canvas.ziele_org ?? [])],
    ziele_funktional: [...(canvas.ziele_funktional ?? [])],
    ziele_people:     [...(canvas.ziele_people ?? [])],
    ziele_tech:       [...(canvas.ziele_tech ?? [])],
    erfolg_narrativ:  canvas.erfolg_narrativ ?? '',
    phases: [...(canvas.canvas_phases ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    kpis:   [...(canvas.canvas_kpis   ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  }
}

// ── Small display components ──────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-foreground/60">
      <span className="inline-block w-1 h-4 rounded-sm bg-primary/50 shrink-0" />
      {children}
    </h2>
  )
}
function AmpelBadge({ ampel }: { ampel: KpiAmpel }) {
  return (
    <span
      className={cn('inline-block w-3.5 h-3.5 rounded-full', AMPEL_DOT[ampel])}
      title={AMPEL_LABEL[ampel]}
    />
  )
}

// ── Main component ────────────────────────────────────────────────
interface Props {
  customers: Customer[]
  engagements: EngagementMeta[]
  activeCustomerId: string
  activeEngagementId: string
  canvas: Canvas | null
}

export function CanvasView({
  customers, engagements, activeCustomerId, activeEngagementId, canvas,
}: Props) {
  const router = useRouter()
  const [form, setForm]           = useState(() => initForm(canvas))
  const [deletedPhaseIds, setDeletedPhaseIds] = useState<string[]>([])
  const [deletedKpiIds,   setDeletedKpiIds]   = useState<string[]>([])
  const [editMode, setEditMode]   = useState(false)
  const [isPending, startTransition] = useTransition()
  const [activeZielTab, setActiveZielTab] = useState<ZielTab>('org')

  // Sync form when canvas prop changes after router.refresh()
  useEffect(() => {
    if (!editMode) setForm(initForm(canvas))
  }, [canvas]) // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent accidental loss of unsaved changes
  useEffect(() => {
    if (!editMode) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [editMode])

  // ── Customer list ─────────────────────────────────────────────
  const parents = useMemo(() => customers.filter(c => !c.parent_id), [customers])
  const childrenByParent = useMemo(() => {
    const map: Record<string, Customer[]> = {}
    customers.filter(c => c.parent_id).forEach(c => {
      map[c.parent_id!] = [...(map[c.parent_id!] ?? []), c]
    })
    return map
  }, [customers])

  // Flat ordered list: parent first, then its children — only those with engagements
  const customersWithEngagements = useMemo(() =>
    parents.flatMap(p => {
      const children = (childrenByParent[p.id] ?? []).filter(c =>
        engagements.some(e => e.customer_id === c.id)
      )
      const parentHasEng = engagements.some(e => e.customer_id === p.id)
      return [...(parentHasEng ? [p] : []), ...children]
    }),
    [parents, childrenByParent, engagements]
  )

  const customerEngagements = useMemo(
    () => engagements.filter(e => e.customer_id === activeCustomerId),
    [engagements, activeCustomerId]
  )

  function handleCustomerChange(customerId: string) {
    const first = engagements.find(e => e.customer_id === customerId)
    if (first) router.push(`/canvas?engagement=${first.id}`, { scroll: false })
  }

  // ── Edit mode ─────────────────────────────────────────────────
  function handleCancel() {
    setForm(initForm(canvas))
    setDeletedPhaseIds([])
    setDeletedKpiIds([])
    setEditMode(false)
  }

  function handleSave() {
    if (!canvas) return
    startTransition(async () => {
      await saveCanvas({
        canvasId: canvas.id,
        fields: {
          ausgangslage:              form.ausgangslage,
          strategischer_kontext:     form.strategischer_kontext,
          treiber:                   form.treiber,
          risiken_bei_nicht_handeln: form.risiken_bei_nicht_handeln,
          ziele_org:        form.ziele_org,
          ziele_funktional: form.ziele_funktional,
          ziele_people:     form.ziele_people,
          ziele_tech:       form.ziele_tech,
          erfolg_narrativ:  form.erfolg_narrativ,
        },
        phases:          form.phases.map((p, i) => ({ ...p, sort_order: i })),
        deletedPhaseIds,
        kpis:            form.kpis.map((k, i) => ({ ...k, sort_order: i })),
        deletedKpiIds,
      })
      setEditMode(false)
      setDeletedPhaseIds([])
      setDeletedKpiIds([])
      router.refresh()
    })
  }

  // ── Form helpers ──────────────────────────────────────────────
  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }
  function updateZiel(tab: ZielTab, i: number, val: string) {
    const k = ZIEL_KEY[tab]
    setForm(prev => { const a = [...prev[k]]; a[i] = val; return { ...prev, [k]: a } })
  }
  function addZiel(tab: ZielTab) {
    const k = ZIEL_KEY[tab]
    setForm(prev => ({ ...prev, [k]: [...prev[k], ''] }))
  }
  function removeZiel(tab: ZielTab, i: number) {
    const k = ZIEL_KEY[tab]
    setForm(prev => { const a = [...prev[k]]; a.splice(i, 1); return { ...prev, [k]: a } })
  }
  function updatePhase(i: number, patch: Partial<PhaseForm>) {
    setForm(prev => { const p = [...prev.phases]; p[i] = { ...p[i], ...patch }; return { ...prev, phases: p } })
  }
  function addPhase() {
    setForm(prev => ({
      ...prev, phases: [...prev.phases, {
        title: 'Neue Phase', start_date: null, end_date: null,
        dates_label: null, color: '#4f8ef7', description: null, goal: null,
        sort_order: prev.phases.length,
      }],
    }))
  }
  function removePhase(i: number) {
    setForm(prev => {
      const p = [...prev.phases]; const [gone] = p.splice(i, 1)
      if (gone.id) setDeletedPhaseIds(ids => [...ids, gone.id!])
      return { ...prev, phases: p }
    })
  }
  function updateKpi(i: number, patch: Partial<KpiForm>) {
    setForm(prev => { const k = [...prev.kpis]; k[i] = { ...k[i], ...patch }; return { ...prev, kpis: k } })
  }
  function addKpi() {
    setForm(prev => ({
      ...prev, kpis: [...prev.kpis, {
        kr_id: null, name: '', sub: null, baseline: null,
        target_value: null, current_value: null, methode: null,
        ampel: 'gray' as KpiAmpel, sort_order: prev.kpis.length,
      }],
    }))
  }
  function removeKpi(i: number) {
    setForm(prev => {
      const k = [...prev.kpis]; const [gone] = k.splice(i, 1)
      if (gone.id) setDeletedKpiIds(ids => [...ids, gone.id!])
      return { ...prev, kpis: k }
    })
  }

  const activeEngagement = engagements.find(e => e.id === activeEngagementId)

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Initiative Canvas</h1>
          {activeEngagement && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {activeEngagement.name}
            </p>
          )}
        </div>
        {canvas && (
          editMode ? (
            <div className="flex gap-2 shrink-0">
              <Button onClick={handleSave} disabled={isPending} size="sm">
                {isPending ? 'Speichern…' : 'Speichern'}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancel}>Abbrechen</Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="shrink-0">
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Bearbeiten
            </Button>
          )
        )}
      </div>

      {/* Cascading filter: Kunde → Initiative */}
      <div className="flex items-center gap-2 flex-wrap pb-4 border-b border-white/10">
        {/* Customer select */}
        <FilterSelect value={activeCustomerId} onChange={handleCustomerChange}>
          {parents.map(parent => {
            const children = (childrenByParent[parent.id] ?? []).filter(c =>
              engagements.some(e => e.customer_id === c.id)
            )
            const parentHasEng = engagements.some(e => e.customer_id === parent.id)
            if (!parentHasEng && children.length === 0) return null
            if (children.length === 0) {
              return <option key={parent.id} value={parent.id}>{parent.name}</option>
            }
            return (
              <optgroup key={parent.id} label={parent.name}>
                {parentHasEng && (
                  <option value={parent.id}>{parent.name} (Gruppe)</option>
                )}
                {children.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
            )
          })}
        </FilterSelect>

        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />

        {/* Engagement select */}
        <FilterSelect
          value={activeEngagementId}
          onChange={id => router.push(`/canvas?engagement=${id}`, { scroll: false })}
        >
          {customerEngagements.map(eng => (
            <option key={eng.id} value={eng.id}>
              {eng.eng_alias ?? eng.name}
            </option>
          ))}
        </FilterSelect>

        {/* Status badge */}
        {activeEngagement && (
          <span className={cn(
            'text-xs px-2.5 py-1 rounded-full font-medium',
            activeEngagement.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' :
            activeEngagement.status === 'hold'   ? 'bg-amber-500/15 text-amber-400' :
            activeEngagement.status === 'draft'  ? 'bg-zinc-500/20 text-zinc-400' :
                                                   'bg-zinc-500/20 text-zinc-400'
          )}>
            {activeEngagement.status === 'active' ? 'Aktiv' :
             activeEngagement.status === 'hold'   ? 'On Hold' :
             activeEngagement.status === 'draft'  ? 'Entwurf' : 'Abgeschlossen'}
          </span>
        )}
      </div>

      {/* No canvas */}
      {!canvas && (
        <p className="text-sm text-muted-foreground italic">Kein Canvas für dieses Engagement vorhanden.</p>
      )}

      {/* Canvas sections */}
      {canvas && (
        <div className="space-y-10">

          {/* ── Warum ───────────────────────────────────────────── */}
          <section className="space-y-3">
            <SectionTitle>Warum</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([
                { key: 'ausgangslage'              as const, label: 'Ausgangslage & Problem' },
                { key: 'strategischer_kontext'     as const, label: 'Strategischer Kontext' },
                { key: 'treiber'                   as const, label: 'Treiber & Auslöser' },
                { key: 'risiken_bei_nicht_handeln' as const, label: 'Risiken bei Nicht-Handeln' },
              ] as const).map(({ key, label }) => (
                <div
                  key={key}
                  className="rounded-lg border border-l-4 bg-card p-4 space-y-2"
                  style={{ borderLeftColor: WARUM_BORDER[key] + '90' }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                  {editMode ? (
                    <textarea
                      value={form[key]}
                      onChange={e => setField(key, e.target.value)}
                      rows={5}
                      className="w-full rounded border bg-transparent px-2 py-1.5 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap min-h-[80px]">
                      {form[key] || <span className="text-muted-foreground italic">–</span>}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ── Ziele ───────────────────────────────────────────── */}
          <section className="space-y-3">
            <SectionTitle>Ziele</SectionTitle>
            <div className="flex gap-1.5 flex-wrap">
              {ZIEL_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveZielTab(tab.key)}
                  className={cn(
                    'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                    activeZielTab === tab.key
                      ? 'bg-muted/80 font-semibold ring-1 ring-white/10 ' + tab.color
                      : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="rounded-lg border bg-card p-4 min-h-[120px] space-y-2">
              {(() => {
                const items = form[ZIEL_KEY[activeZielTab]]
                return (
                  <>
                    {items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        {editMode ? (
                          <>
                            <input
                              value={item}
                              onChange={e => updateZiel(activeZielTab, i, e.target.value)}
                              className="flex-1 rounded border bg-transparent px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                            <button onClick={() => removeZiel(activeZielTab, i)} className="mt-1 text-muted-foreground hover:text-destructive transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <p className="text-sm leading-relaxed">
                            <span className="text-primary/60 mr-1.5">→</span>{item}
                          </p>
                        )}
                      </div>
                    ))}
                    {items.length === 0 && !editMode && (
                      <p className="text-sm text-muted-foreground italic">Keine Ziele definiert.</p>
                    )}
                    {editMode && (
                      <button
                        onClick={() => addZiel(activeZielTab)}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors pt-1"
                      >
                        <Plus className="h-4 w-4" />
                        Ziel hinzufügen
                      </button>
                    )}
                  </>
                )
              })()}
            </div>
          </section>

          {/* ── Zeithorizont ────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <SectionTitle>Zeithorizont</SectionTitle>
              {editMode && (
                <button
                  onClick={addPhase}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Phase
                </button>
              )}
            </div>
            {form.phases.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Keine Phasen definiert.</p>
            ) : (
              <div className="relative pl-7">
                {/* Vertical connector line */}
                {form.phases.length > 1 && (
                  <div className="absolute left-[9px] top-3 bottom-3 w-px bg-white/10" />
                )}
                <div className="space-y-5">
                  {form.phases.map((phase, i) => (
                    <div key={phase.id ?? `new-${i}`} className="relative flex gap-4">
                      {/* Timeline dot */}
                      <div
                        className="absolute -left-7 top-1.5 w-4 h-4 rounded-full ring-2 ring-background z-10 shrink-0"
                        style={{ backgroundColor: phase.color ?? '#4f8ef7' }}
                      />
                      {/* Card */}
                      <div className="flex-1 rounded-lg border bg-card p-4 space-y-2">
                        {editMode && (
                          <button
                            onClick={() => removePhase(i)}
                            className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {editMode ? (
                          <div className="space-y-2 pr-5">
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={phase.color ?? '#4f8ef7'}
                                onChange={e => updatePhase(i, { color: e.target.value })}
                                className="w-6 h-6 shrink-0 rounded cursor-pointer border p-0.5 bg-transparent"
                              />
                              <input
                                value={phase.title}
                                onChange={e => updatePhase(i, { title: e.target.value })}
                                placeholder="Titel"
                                className="flex-1 rounded border bg-transparent px-2 py-1 text-sm font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              />
                            </div>
                            <input
                              value={phase.dates_label ?? ''}
                              onChange={e => updatePhase(i, { dates_label: e.target.value })}
                              placeholder="Jan – Mär 2024"
                              className="w-full rounded border bg-transparent px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                            <textarea
                              value={phase.description ?? ''}
                              onChange={e => updatePhase(i, { description: e.target.value })}
                              placeholder="Aktivitäten / Beschreibung"
                              rows={3}
                              className="w-full rounded border bg-transparent px-2 py-1 text-xs resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                            <textarea
                              value={phase.goal ?? ''}
                              onChange={e => updatePhase(i, { goal: e.target.value })}
                              placeholder="Meilenstein / Exit-Kriterium"
                              rows={2}
                              className="w-full rounded border bg-transparent px-2 py-1 text-xs resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold leading-tight">{phase.title}</p>
                              {phase.dates_label && (
                                <span className="text-xs text-muted-foreground">· {phase.dates_label}</span>
                              )}
                            </div>
                            {phase.description && (
                              <p className="text-xs leading-relaxed text-muted-foreground">
                                {phase.description}
                              </p>
                            )}
                            {phase.goal && (
                              <p className="text-xs leading-relaxed italic border-l-2 pl-2" style={{ borderLeftColor: (phase.color ?? '#4f8ef7') + '80' }}>
                                {phase.goal}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── Erfolg & Messung ────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <SectionTitle>Erfolg & Messung</SectionTitle>
              {editMode && (
                <button
                  onClick={addKpi}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  KPI
                </button>
              )}
            </div>

            {/* Erfolg-Narrativ — shown first */}
            <div className="rounded-lg border border-l-4 border-l-primary/40 bg-card p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Erfolg-Narrativ</p>
              {editMode ? (
                <textarea
                  value={form.erfolg_narrativ}
                  onChange={e => setField('erfolg_narrativ', e.target.value)}
                  rows={4}
                  placeholder="Wie sieht Erfolg konkret aus?"
                  className="w-full rounded border bg-transparent px-2 py-1.5 text-sm resize-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {form.erfolg_narrativ || <span className="text-muted-foreground italic">–</span>}
                </p>
              )}
            </div>

            {/* KPI table — shown second */}
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">KPI</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground w-24">Baseline</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground w-24">Zielwert</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground w-24">Istwert</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Methode</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground w-16">RAG</th>
                      {editMode && <th className="w-10" />}
                    </tr>
                  </thead>
                  <tbody>
                    {form.kpis.map((kpi, i) => (
                      <tr key={kpi.id ?? `kpi-${i}`} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                        {editMode ? (
                          <>
                            <td className="px-3 py-2">
                              <input
                                value={kpi.name}
                                onChange={e => updateKpi(i, { name: e.target.value })}
                                placeholder="KPI-Name"
                                className="w-full rounded border bg-transparent px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              />
                              <input
                                value={kpi.sub ?? ''}
                                onChange={e => updateKpi(i, { sub: e.target.value || null })}
                                placeholder="Beschreibung (optional)"
                                className="w-full mt-1 rounded border bg-transparent px-2 py-0.5 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              />
                            </td>
                            {(['baseline', 'target_value', 'current_value'] as const).map(field => (
                              <td key={field} className="px-3 py-2">
                                <input
                                  value={kpi[field] ?? ''}
                                  onChange={e => updateKpi(i, { [field]: e.target.value || null })}
                                  className="w-full rounded border bg-transparent px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                              </td>
                            ))}
                            <td className="px-3 py-2">
                              <select
                                value={kpi.methode ?? ''}
                                onChange={e => updateKpi(i, { methode: e.target.value || null })}
                                className="w-full rounded border bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              >
                                <option value="">–</option>
                                {METHODE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={kpi.ampel}
                                onChange={e => updateKpi(i, { ampel: e.target.value as KpiAmpel })}
                                className="w-full rounded border bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              >
                                {(Object.entries(AMPEL_LABEL) as [KpiAmpel, string][]).map(([val, lbl]) => (
                                  <option key={val} value={val}>{lbl}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button onClick={() => removeKpi(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                                <X className="h-4 w-4" />
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-3">
                              <p className="font-medium">{kpi.name}</p>
                              {kpi.sub && <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>}
                            </td>
                            <td className="px-3 py-3 text-muted-foreground">{kpi.baseline ?? '–'}</td>
                            <td className="px-3 py-3 font-medium">{kpi.target_value ?? '–'}</td>
                            <td className="px-3 py-3">{kpi.current_value ?? '–'}</td>
                            <td className="px-3 py-3 text-xs text-muted-foreground">{kpi.methode ?? '–'}</td>
                            <td className="px-3 py-3 text-center">
                              <AmpelBadge ampel={kpi.ampel} />
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                    {form.kpis.length === 0 && (
                      <tr>
                        <td colSpan={editMode ? 7 : 6} className="px-3 py-8 text-center text-sm text-muted-foreground italic">
                          Keine KPIs definiert.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

        </div>
      )}
    </div>
  )
}
