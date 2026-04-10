'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Trash2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  type MatrixStakeholder,
  type MatrixRelationship,
  type InterestValue,
  type RelationshipType,
  INTEREST_X,
  POWER_Y,
  INTEREST_COLOR,
  INTEREST_LABEL,
  REL_COLOR,
  REL_DASH,
} from './types'

interface Customer {
  id: string
  name: string
  parent_id: string | null
}

interface Engagement {
  id: string
  name: string
  eng_alias: string | null
  customer_id: string
}

interface Props {
  customers: Customer[]
  engagements: Engagement[]
  initialEngagementId: string
}

const REL_TYPES: RelationshipType[] = ['Sponsor', 'Champion', 'Berichtslinie', 'Peer', 'Influencer', 'Blocker']
const INTEREST_VALS: InterestValue[] = ['--', '-', '0', '+', '++']
const CELL_W = 20
const CELL_H = 100 / 6

const COLOR_PRESETS = [
  '#4f8ef7', '#a78bfa', '#22c55e', '#86efac', '#f59e0b',
  '#f97316', '#f43f5e', '#e879f9', '#06b6d4', '#8b92a8',
]

// ── Shared panel styles ───────────────────────────────────────────
const inputCls =
  'w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm ' +
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 ' +
  'placeholder:text-muted-foreground/50 transition-colors hover:bg-white/[0.07]'

const textareaCls = inputCls + ' resize-none'

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
      {children}
    </label>
  )
}

// ── Position computation ─────────────────────────────────────────
function computePositions(stakeholders: MatrixStakeholder[]): MatrixStakeholder[] {
  const groups: Record<string, MatrixStakeholder[]> = {}
  stakeholders.forEach(s => {
    const key = `${s.interest}|${s.power}`
    if (!groups[key]) groups[key] = []
    groups[key].push(s)
  })
  return stakeholders.map(s => {
    const key = `${s.interest}|${s.power}`
    const group = groups[key]
    const idx = group.indexOf(s)
    const n = group.length
    const cellCX = INTEREST_X[s.interest as InterestValue] ?? 46
    const cellCY = POWER_Y[Math.min(5, Math.max(0, Math.round(s.power)))] ?? 50
    if (n === 1) return { ...s, posX: cellCX, posY: cellCY }
    const cols = Math.min(n, 3)
    const rows = Math.ceil(n / cols)
    const c = idx % cols
    const r = Math.floor(idx / cols)
    const spreadX = Math.min(6, (CELL_W * 0.55) / cols)
    const spreadY = Math.min(4, (CELL_H * 0.5) / rows)
    const startX = cellCX - spreadX * (cols - 1) / 2
    const startY = cellCY - spreadY * (rows - 1) / 2
    return { ...s, posX: startX + c * spreadX, posY: startY + r * spreadY }
  })
}

// ── SVG Relationship Layer ────────────────────────────────────────
function RelSvg({
  relationships, stakeholders, canvasW, canvasH,
  hoveredRel, onHover, onLeave, onRelClick,
}: {
  relationships: MatrixRelationship[]
  stakeholders: MatrixStakeholder[]
  canvasW: number
  canvasH: number
  hoveredRel: number | null
  onHover: (idx: number, e: React.MouseEvent) => void
  onLeave: () => void
  onRelClick: (rel: MatrixRelationship) => void
}) {
  if (!canvasW || !canvasH) return null
  const DOT_R = 16

  function dotPos(id: string) {
    const s = stakeholders.find(x => x.id === id)
    if (!s) return null
    return { x: s.posX / 100 * canvasW, y: s.posY / 100 * canvasH }
  }

  const markerDefs = REL_TYPES.map(type => {
    const col = REL_COLOR[type]
    return (
      <g key={type}>
        <marker id={`ra-${type}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M1 1L7 4L1 7" fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        <marker id={`ra-${type}-rev`} viewBox="0 0 8 8" refX="1" refY="4" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M7 1L1 4L7 7" fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </g>
    )
  })

  const paths = relationships.map((rel, idx) => {
    const a = dotPos(rel.from_id)
    const b = dotPos(rel.to_id)
    if (!a || !b) return null
    const dx = b.x - a.x, dy = b.y - a.y
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const nx = dx / len, ny = dy / len
    const sx = a.x + nx * DOT_R, sy = a.y + ny * DOT_R
    const ex = b.x - nx * DOT_R, ey = b.y - ny * DOT_R
    const mx = (sx + ex) / 2, my = (sy + ey) / 2
    const cx = mx - ny * 20,  cy = my + nx * 20
    const col = REL_COLOR[rel.type] ?? '#8b92a8'
    const dashes = REL_DASH[rel.type] ?? 'none'
    const sw = 1.2 + rel.strength * 0.35
    const isHovered = hoveredRel === idx
    const d = `M${sx.toFixed(1)},${sy.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`
    return (
      <g key={rel.id}>
        <path
          d={d} fill="none" stroke="rgba(0,0,0,0)" strokeWidth={18}
          style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
          onMouseEnter={e => onHover(idx, e)}
          onMouseLeave={onLeave}
          onClick={e => { e.stopPropagation(); onRelClick(rel) }}
        />
        <path
          d={d} fill="none" stroke={col}
          strokeWidth={isHovered ? sw + 0.8 : sw}
          strokeDasharray={dashes !== 'none' ? dashes : undefined}
          markerEnd={`url(#ra-${rel.type})`}
          markerStart={rel.bidirectional ? `url(#ra-${rel.type}-rev)` : undefined}
          style={{ pointerEvents: 'none', transition: 'stroke-width 0.1s', filter: isHovered ? `drop-shadow(0 0 4px ${col}80)` : undefined }}
          opacity={hoveredRel !== null && hoveredRel !== idx ? 0.3 : 1}
        />
      </g>
    )
  })

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 1, pointerEvents: 'all' }}>
      <defs>{markerDefs}</defs>
      {paths}
    </svg>
  )
}

// ── Stakeholder Dot ───────────────────────────────────────────────
function StakeholderDot({ sh, onClick }: { sh: MatrixStakeholder; onClick: (sh: MatrixStakeholder) => void }) {
  const col = sh.color ?? INTEREST_COLOR[sh.interest as InterestValue] ?? '#4f8ef7'
  const size = sh.type === 'group' ? 36 : 30
  return (
    <div
      className="absolute flex flex-col items-center"
      style={{ left: `${sh.posX}%`, top: `${sh.posY}%`, transform: 'translate(-50%, -50%)', zIndex: 4, cursor: 'pointer' }}
      onClick={() => onClick(sh)}
    >
      {sh.risk_flag && (
        <div className="absolute rounded-full border-2 border-dashed border-rose-500" style={{ width: size + 10, height: size + 10, top: -5, left: -5 }} />
      )}
      <div
        className="flex items-center justify-center text-[9px] font-bold text-white select-none"
        title={`${sh.name} · I: ${sh.interest} · P: ${sh.power}`}
        style={{
          width: size, height: size,
          background: col,
          borderRadius: sh.type === 'group' ? '4px' : '50%',
          clipPath: sh.type === 'group' ? 'polygon(50% 0%,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)' : undefined,
          boxShadow: `0 0 0 2px #1E2B32, 0 2px 8px ${col}60`,
        }}
      >
        {sh.initials ?? sh.name.slice(0, 2).toUpperCase()}
      </div>
    </div>
  )
}

// ── Relationship Tooltip (hover) ──────────────────────────────────
function RelTooltip({ rel, x, y }: { rel: MatrixRelationship; x: number; y: number }) {
  const col = REL_COLOR[rel.type] ?? '#8b92a8'
  return (
    <div
      className="fixed z-50 pointer-events-none rounded-lg border border-white/10 bg-background/95 backdrop-blur-sm px-3 py-2.5 shadow-xl text-xs"
      style={{ left: x + 14, top: y - 10, maxWidth: 220 }}
    >
      <div className="font-semibold text-foreground mb-1">
        {rel.from_name} {rel.bidirectional ? '↔' : '→'} {rel.to_name}
      </div>
      <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded mb-1" style={{ background: col + '22', color: col }}>
        {rel.type}
      </span>
      <div className="flex gap-0.5 my-1">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="inline-block w-2 h-2 rounded-full" style={{ background: i < rel.strength ? col : 'rgba(255,255,255,0.1)' }} />
        ))}
      </div>
      {rel.notes && <div className="text-muted-foreground/80 mt-1 leading-relaxed">{rel.notes}</div>}
      <div className="text-[9px] text-muted-foreground/40 mt-1.5">Klick zum Bearbeiten</div>
    </div>
  )
}

// ── Relationship Panel (slide-over) ──────────────────────────────
function RelPanel({
  rel, stakeholders, engId, open, onClose, onSaved, onDeleted,
}: {
  rel: MatrixRelationship | null
  stakeholders: MatrixStakeholder[]
  engId: string
  open: boolean
  onClose: () => void
  onSaved: (rel: MatrixRelationship) => void
  onDeleted: (id: string) => void
}) {
  const isEdit = rel !== null
  const [fromId, setFromId] = useState(rel?.from_id ?? '')
  const [toId,   setToId]   = useState(rel?.to_id   ?? '')
  const [type,   setType]   = useState<RelationshipType>(rel?.type ?? 'Peer')
  const [strength, setStrength] = useState(rel?.strength ?? 3)
  const [bidirectional, setBidirectional] = useState(rel?.bidirectional ?? false)
  const [notes, setNotes] = useState(rel?.notes ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Sync form when the relationship prop changes (different line clicked)
  useEffect(() => {
    setFromId(rel?.from_id ?? '')
    setToId(rel?.to_id ?? '')
    setType(rel?.type ?? 'Peer')
    setStrength(rel?.strength ?? 3)
    setBidirectional(rel?.bidirectional ?? false)
    setNotes(rel?.notes ?? '')
    setError(null)
  }, [rel?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const relColor = REL_COLOR[type] ?? '#8b92a8'

  function handleSave() {
    if (!fromId || !toId) { setError('Von und Zu sind Pflichtfelder.'); return }
    if (fromId === toId) { setError('Von und Zu müssen unterschiedliche Stakeholder sein.'); return }
    setError(null)
    startTransition(async () => {
      try {
        const supabase = createClient()
        const shMap = Object.fromEntries(stakeholders.map(s => [s.id, s.name]))
        const payload = { from_id: fromId, to_id: toId, type, strength, bidirectional, notes: notes.trim() || null }

        if (isEdit && rel) {
          const { error: err } = await supabase.from('stakeholder_relationships').update(payload).eq('id', rel.id)
          if (err) throw err
          onSaved({ id: rel.id, from_name: shMap[fromId] ?? fromId, to_name: shMap[toId] ?? toId, ...payload })
        } else {
          const { data, error: err } = await supabase
            .from('stakeholder_relationships')
            .insert({ engagement_id: engId, ...payload })
            .select('id').single()
          if (err) throw err
          onSaved({ id: data.id, from_name: shMap[fromId] ?? fromId, to_name: shMap[toId] ?? toId, ...payload })
        }
      } catch (e: any) {
        setError(e.message ?? 'Fehler beim Speichern.')
      }
    })
  }

  function handleDelete() {
    if (!rel) return
    startTransition(async () => {
      try {
        const supabase = createClient()
        const { error: err } = await supabase.from('stakeholder_relationships').delete().eq('id', rel.id)
        if (err) throw err
        onDeleted(rel.id)
      } catch (e: any) {
        setError(e.message ?? 'Fehler beim Löschen.')
      }
    })
  }

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
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: relColor }} />
            <span className="text-sm font-semibold">{isEdit ? 'Beziehung bearbeiten' : 'Neue Beziehung'}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto space-y-4 px-5 py-5">

          {/* Von */}
          <div className="space-y-1.5">
            <FieldLabel>Von *</FieldLabel>
            <select className={inputCls} value={fromId} onChange={e => setFromId(e.target.value)}>
              <option value="">— wählen —</option>
              {stakeholders.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Zu */}
          <div className="space-y-1.5">
            <FieldLabel>Zu *</FieldLabel>
            <select className={inputCls} value={toId} onChange={e => setToId(e.target.value)}>
              <option value="">— wählen —</option>
              {stakeholders.filter(s => s.id !== fromId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Typ */}
          <div className="space-y-1.5">
            <FieldLabel>Typ *</FieldLabel>
            <select
              className={inputCls}
              value={type}
              onChange={e => setType(e.target.value as RelationshipType)}
              style={{ borderLeftColor: relColor, borderLeftWidth: 3 }}
            >
              {REL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Stärke */}
          <div className="space-y-1.5">
            <FieldLabel>Stärke</FieldLabel>
            <div className="flex gap-2 pt-1">
              {[1, 2, 3, 4, 5].map(v => (
                <button
                  key={v}
                  onClick={() => setStrength(v)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    background: v <= strength ? relColor : 'rgba(255,255,255,0.06)',
                    color: v <= strength ? '#fff' : 'rgba(255,255,255,0.3)',
                    boxShadow: v <= strength ? `0 0 8px ${relColor}50` : undefined,
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Bidirektional */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={bidirectional}
              onChange={e => setBidirectional(e.target.checked)}
              className="accent-primary"
            />
            <span className="text-sm text-muted-foreground">↔ Bidirektional (Beziehung in beide Richtungen)</span>
          </label>

          {/* Notizen */}
          <div className="space-y-1.5">
            <FieldLabel>Notizen</FieldLabel>
            <textarea
              className={textareaCls}
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Kontext, Hintergrund…"
            />
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-5 py-3 flex gap-2 bg-white/[0.02] shrink-0">
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="flex items-center gap-1.5 text-xs text-rose-400/70 hover:text-rose-400 transition-colors mr-auto disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Löschen
            </button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={isPending} className="ml-auto hover:bg-white/10">
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={isPending || !fromId || !toId} className="bg-primary/90 hover:bg-primary">
            {isPending ? 'Speichern…' : 'Speichern'}
          </Button>
        </div>
      </div>
    </>
  )
}

// ── Stakeholder Panel (slide-over) ───────────────────────────────
function StakeholderPanel({
  sh, engId, customerId, open, onClose, onSaved, onDeleted,
}: {
  sh: MatrixStakeholder | null
  engId: string
  customerId: string
  open: boolean
  onClose: () => void
  onSaved: (sh: MatrixStakeholder) => void
  onDeleted: (id: string) => void
}) {
  const isEdit = sh !== null

  const [name, setName] = useState(sh?.name ?? '')
  const [type, setType] = useState<'person' | 'group'>(sh?.type ?? 'person')
  const [initials, setInitials] = useState(sh?.initials ?? '')
  const [color, setColor] = useState(sh?.color ?? COLOR_PRESETS[0])
  const [role, setRole] = useState(sh?.role ?? '')
  const [groupSize, setGroupSize] = useState<number>(sh?.group_size ?? 2)
  const [power, setPower] = useState<number>(sh?.power ?? 3)
  const [interest, setInterest] = useState<InterestValue>(sh?.interest ?? '0')
  const [riskFlag, setRiskFlag] = useState(sh?.risk_flag ?? false)
  const [relToConsultant, setRelToConsultant] = useState(sh?.rel_to_consultant ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(sh?.name ?? '')
    setType(sh?.type ?? 'person')
    setInitials(sh?.initials ?? '')
    setColor(sh?.color ?? COLOR_PRESETS[0])
    setRole(sh?.role ?? '')
    setGroupSize(sh?.group_size ?? 2)
    setPower(sh?.power ?? 3)
    setInterest(sh?.interest ?? '0')
    setRiskFlag(sh?.risk_flag ?? false)
    setRelToConsultant(sh?.rel_to_consultant ?? '')
    setError(null)
  }, [sh?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const intCol = INTEREST_COLOR[interest]

  function handleSave() {
    if (!name.trim()) { setError('Name ist ein Pflichtfeld.'); return }
    setError(null)
    startTransition(async () => {
      try {
        const supabase = createClient()
        const shData = {
          name: name.trim(),
          type,
          role: role.trim() || null,
          initials: initials.trim() || null,
          color: color || null,
          group_size: type === 'group' ? (groupSize || null) : null,
        }
        const profData = {
          power,
          interest,
          risk_flag: riskFlag,
          rel_to_consultant: relToConsultant.trim() || null,
        }

        if (isEdit && sh) {
          const [{ error: e1 }, { error: e2 }] = await Promise.all([
            supabase.from('stakeholders').update(shData).eq('id', sh.id),
            supabase.from('stakeholder_profiles').update(profData).eq('stakeholder_id', sh.id).eq('engagement_id', engId),
          ])
          if (e1) throw e1
          if (e2) throw e2
          onSaved({ ...sh, ...shData, ...profData, posX: 0, posY: 0 })
        } else {
          const { data: newSh, error: e1 } = await supabase
            .from('stakeholders')
            .insert({ customer_id: customerId, ...shData })
            .select('id').single()
          if (e1) throw e1
          const { error: e2 } = await supabase
            .from('stakeholder_profiles')
            .insert({ stakeholder_id: newSh.id, engagement_id: engId, ...profData })
          if (e2) throw e2
          onSaved({ id: newSh.id, ...shData, ...profData, posX: 0, posY: 0 })
        }
      } catch (e: any) {
        setError(e.message ?? 'Fehler beim Speichern.')
      }
    })
  }

  function handleDelete() {
    if (!sh) return
    startTransition(async () => {
      try {
        const supabase = createClient()
        const { error: err } = await supabase
          .from('stakeholder_profiles')
          .delete()
          .eq('stakeholder_id', sh.id)
          .eq('engagement_id', engId)
        if (err) throw err
        onDeleted(sh.id)
      } catch (e: any) {
        setError(e.message ?? 'Fehler beim Löschen.')
      }
    })
  }

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
          'fixed right-0 top-0 z-40 flex h-screen w-[420px] flex-col',
          'border-l border-white/10 bg-background/90 backdrop-blur-xl',
          'shadow-[-8px_0_32px_rgba(0,0,0,0.3)]',
          'transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-white/[0.03] shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
              style={{ background: color ?? '#4f8ef7' }}
            >
              {(initials || name).slice(0, 2).toUpperCase() || '?'}
            </div>
            <span className="text-sm font-semibold">{isEdit ? 'Stakeholder bearbeiten' : 'Neuer Stakeholder'}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto space-y-4 px-5 py-5">

          {/* Name */}
          <div className="space-y-1.5">
            <FieldLabel>Name *</FieldLabel>
            <input
              className={inputCls}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Name des Stakeholders…"
            />
          </div>

          {/* Typ */}
          <div className="space-y-1.5">
            <FieldLabel>Typ</FieldLabel>
            <div className="flex gap-2">
              {(['person', 'group'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    'flex-1 py-1.5 rounded text-xs font-medium transition-colors border',
                    type === t
                      ? 'bg-primary/20 text-primary border-primary/40'
                      : 'bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10'
                  )}
                >
                  {t === 'person' ? 'Person' : 'Gruppe'}
                </button>
              ))}
            </div>
          </div>

          {/* Initials + Color */}
          <div className="flex gap-4">
            <div className="space-y-1.5 w-28 shrink-0">
              <FieldLabel>Kürzel (max. 3)</FieldLabel>
              <input
                className={inputCls}
                value={initials}
                maxLength={3}
                onChange={e => setInitials(e.target.value.toUpperCase())}
                placeholder="z.B. TM"
              />
            </div>
            <div className="space-y-1.5 flex-1">
              <FieldLabel>Farbe</FieldLabel>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-5 h-5 rounded-full transition-transform hover:scale-110 shrink-0"
                    style={{
                      background: c,
                      outline: color === c ? `2px solid ${c}` : undefined,
                      outlineOffset: color === c ? 2 : undefined,
                      boxShadow: color === c ? `0 0 6px ${c}60` : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Role (person) or group size (group) */}
          {type === 'person' ? (
            <div className="space-y-1.5">
              <FieldLabel>Rolle / Position</FieldLabel>
              <input
                className={inputCls}
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="z.B. CIO, Head of HR…"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <FieldLabel>Anzahl Personen</FieldLabel>
              <input
                type="number"
                min={1}
                className={inputCls}
                value={groupSize}
                onChange={e => setGroupSize(Number(e.target.value))}
              />
            </div>
          )}

          {/* Power */}
          <div className="space-y-1.5">
            <FieldLabel>Power (Einfluss)</FieldLabel>
            <div className="flex gap-2 pt-0.5">
              {[0, 1, 2, 3, 4, 5].map(v => (
                <button
                  key={v}
                  onClick={() => setPower(v)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    background: v === power ? '#4f8ef7' : 'rgba(255,255,255,0.06)',
                    color: v === power ? '#fff' : 'rgba(255,255,255,0.3)',
                    boxShadow: v === power ? '0 0 8px #4f8ef750' : undefined,
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Interest */}
          <div className="space-y-1.5">
            <FieldLabel>Interest (Interesse)</FieldLabel>
            <div className="flex gap-1.5 pt-0.5">
              {INTEREST_VALS.map(v => {
                const c = INTEREST_COLOR[v]
                const sel = v === interest
                return (
                  <button
                    key={v}
                    onClick={() => setInterest(v)}
                    className="flex-1 py-1.5 rounded text-xs font-mono font-bold transition-all border"
                    style={{
                      background: sel ? c + '33' : 'rgba(255,255,255,0.04)',
                      color: sel ? c : 'rgba(255,255,255,0.3)',
                      borderColor: sel ? c + '60' : 'rgba(255,255,255,0.08)',
                      boxShadow: sel ? `0 0 8px ${c}40` : undefined,
                    }}
                  >
                    {v}
                  </button>
                )
              })}
            </div>
            <div className="text-[10px] text-center font-medium" style={{ color: intCol }}>
              {INTEREST_LABEL[interest]}
            </div>
          </div>

          {/* Rel to consultant */}
          <div className="space-y-1.5">
            <FieldLabel>Verhältnis zum Berater</FieldLabel>
            <input
              className={inputCls}
              value={relToConsultant}
              onChange={e => setRelToConsultant(e.target.value)}
              placeholder="z.B. Sponsor, Critic…"
            />
          </div>

          {/* Risk flag */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={riskFlag}
              onChange={e => setRiskFlag(e.target.checked)}
              className="accent-rose-500"
            />
            <span className="text-sm text-muted-foreground">⚠ Risiko-Flag (gestrichelter Ring)</span>
          </label>

          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-5 py-3 flex gap-2 bg-white/[0.02] shrink-0">
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="flex items-center gap-1.5 text-xs text-rose-400/70 hover:text-rose-400 transition-colors mr-auto disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Aus Initiative entfernen
            </button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={isPending} className="ml-auto hover:bg-white/10">
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={isPending || !name.trim()} className="bg-primary/90 hover:bg-primary">
            {isPending ? 'Speichern…' : 'Speichern'}
          </Button>
        </div>
      </div>
    </>
  )
}

// ── Main MatrixView ───────────────────────────────────────────────
export function MatrixView({ customers, engagements, initialEngagementId }: Props) {
  const router = useRouter()
  const [engId, setEngId] = useState(initialEngagementId)
  const initialCustomer = engagements.find(e => e.id === initialEngagementId)?.customer_id ?? 'all'
  const [custId, setCustId] = useState(initialCustomer)
  const [stakeholders, setStakeholders] = useState<MatrixStakeholder[]>([])
  const [relationships, setRelationships] = useState<MatrixRelationship[]>([])
  const [loading, setLoading] = useState(false)
  const [hoveredRel, setHoveredRel] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<{ rel: MatrixRelationship; x: number; y: number } | null>(null)
  const [relPanelOpen, setRelPanelOpen] = useState(false)
  const [relPanelRel, setRelPanelRel] = useState<MatrixRelationship | null>(null)
  const [shPanelOpen, setShPanelOpen] = useState(false)
  const [shPanelSh, setShPanelSh] = useState<MatrixStakeholder | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [canvasDims, setCanvasDims] = useState({ w: 0, h: 0 })

  const activeEng = engagements.find(e => e.id === engId)
  const customerId = activeEng?.customer_id ?? ''

  useEffect(() => {
    if (!canvasRef.current) return
    const obs = new ResizeObserver(entries => {
      const r = entries[0].contentRect
      setCanvasDims({ w: r.width, h: r.height })
    })
    obs.observe(canvasRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!engId) return
    setLoading(true)
    const supabase = createClient()
    Promise.all([
      supabase
        .from('stakeholder_profiles')
        .select('power, interest, risk_flag, rel_to_consultant, stakeholder_id, stakeholders(id, name, type, role, initials, color, group_size)')
        .eq('engagement_id', engId),
      supabase
        .from('stakeholder_relationships')
        .select('id, from_id, to_id, type, strength, bidirectional, notes')
        .eq('engagement_id', engId),
    ]).then(([profilesRes, relsRes]) => {
      const raw: MatrixStakeholder[] = (profilesRes.data ?? []).map(p => {
        const sh = (p.stakeholders as any) ?? {}
        return {
          id: sh.id ?? p.stakeholder_id,
          name: sh.name ?? '?',
          type: sh.type ?? 'person',
          role: sh.role ?? null,
          initials: sh.initials ?? null,
          color: sh.color ?? null,
          group_size: sh.group_size ?? null,
          power: p.power ?? 3,
          interest: (p.interest ?? '0') as InterestValue,
          risk_flag: p.risk_flag ?? false,
          rel_to_consultant: p.rel_to_consultant ?? null,
          posX: 0, posY: 0,
        }
      })
      setStakeholders(computePositions(raw))

      const shMap = Object.fromEntries(raw.map(s => [s.id, s.name]))
      const rels: MatrixRelationship[] = (relsRes.data ?? []).map(r => ({
        id: r.id,
        from_id: r.from_id, to_id: r.to_id,
        from_name: shMap[r.from_id] ?? r.from_id,
        to_name: shMap[r.to_id] ?? r.to_id,
        type: r.type as RelationshipType,
        strength: r.strength ?? 3,
        bidirectional: r.bidirectional ?? false,
        notes: r.notes ?? null,
      }))
      setRelationships(rels)
      setLoading(false)
    })
  }, [engId])

  function selectCustomer(id: string) {
    setCustId(id)
    // Auto-select first engagement of this customer, or keep current if it belongs to new customer
    const engsForCust = id === 'all' ? engagements : engagements.filter(e => e.customer_id === id)
    const keep = engsForCust.find(e => e.id === engId)
    const next = keep ?? engsForCust[0]
    if (next && next.id !== engId) selectEngagement(next.id)
  }

  function selectEngagement(id: string) {
    setEngId(id)
    setRelPanelOpen(false)
    setShPanelOpen(false)
    router.push(`/stakeholders?engagement=${id}`, { scroll: false })
  }

  function openRelPanel(rel: MatrixRelationship | null) {
    setRelPanelRel(rel)
    setRelPanelOpen(true)
    setShPanelOpen(false)
    setTooltip(null)
    setHoveredRel(null)
  }

  function handleRelSaved(saved: MatrixRelationship) {
    setRelationships(prev => {
      const idx = prev.findIndex(r => r.id === saved.id)
      return idx >= 0
        ? [...prev.slice(0, idx), saved, ...prev.slice(idx + 1)]
        : [...prev, saved]
    })
    setRelPanelOpen(false)
  }

  function handleRelDeleted(id: string) {
    setRelationships(prev => prev.filter(r => r.id !== id))
    setRelPanelOpen(false)
  }

  function openShPanel(sh: MatrixStakeholder | null) {
    setShPanelSh(sh)
    setShPanelOpen(true)
    setRelPanelOpen(false)
    setTooltip(null)
    setHoveredRel(null)
  }

  function handleShSaved(saved: MatrixStakeholder) {
    setStakeholders(prev => {
      const idx = prev.findIndex(s => s.id === saved.id)
      const updated = idx >= 0
        ? [...prev.slice(0, idx), saved, ...prev.slice(idx + 1)]
        : [...prev, saved]
      return computePositions(updated)
    })
    setShPanelOpen(false)
  }

  function handleShDeleted(id: string) {
    setStakeholders(prev => computePositions(prev.filter(s => s.id !== id)))
    setRelationships(prev => prev.filter(r => r.from_id !== id && r.to_id !== id))
    setShPanelOpen(false)
  }

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">

      {/* Toolbar */}
      <div className="flex items-center gap-3 shrink-0 flex-wrap">
        <select
          value={custId}
          onChange={e => selectCustomer(e.target.value)}
          className="rounded-lg border border-white/10 bg-muted/50 px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-white/30 cursor-pointer hover:bg-muted/70 transition-colors"
        >
          <option value="all">Alle Kunden</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={engId}
          onChange={e => selectEngagement(e.target.value)}
          className="rounded-lg border border-white/10 bg-muted/50 px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-white/30 cursor-pointer hover:bg-muted/70 transition-colors"
        >
          {(custId === 'all' ? engagements : engagements.filter(e => e.customer_id === custId)).map(e => (
            <option key={e.id} value={e.id}>{e.eng_alias ?? e.name}</option>
          ))}
        </select>

        {/* Action buttons */}
        {engId && !loading && (
          <button
            onClick={() => openShPanel(null)}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
          >
            <Plus className="h-3 w-3" />
            Neuer Stakeholder
          </button>
        )}
        {engId && !loading && stakeholders.length >= 2 && (
          <button
            onClick={() => openRelPanel(null)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors',
              !engId || loading ? 'ml-auto' : ''
            )}
          >
            <Plus className="h-3 w-3" />
            Neue Beziehung
          </button>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 rounded-full bg-primary/60" />Person
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 bg-amber-400/80" style={{ clipPath: 'polygon(50% 0%,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)' }} />Gruppe
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-dashed border-rose-500" />Risiko
          </span>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">

        {/* ── Matrix canvas ── */}
        <div className="flex-1 min-w-0 flex flex-col border border-white/10 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 shrink-0 bg-white/[0.02]">
            <span className="text-xs font-semibold text-muted-foreground">
              {engagements.find(e => e.id === engId)?.name ?? ''}
            </span>
            <span className="text-[10px] text-muted-foreground/50">
              Dot / Zeile anklicken zum Bearbeiten · Linie anklicken für Beziehungen
            </span>
          </div>

          <div className="flex flex-1 min-h-0 p-3 gap-2">
            {/* Y-axis labels */}
            <div className="flex flex-col justify-between pb-6 w-5 shrink-0 text-right">
              {[5, 4, 3, 2, 1, 0].map(p => (
                <span key={p} className="text-[10px] font-mono text-muted-foreground/60">{p}</span>
              ))}
            </div>

            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex justify-between px-0 pb-1 shrink-0">
                {INTEREST_VALS.map(v => (
                  <span key={v} className="flex-1 text-center text-[10px] font-mono font-semibold" style={{ color: INTEREST_COLOR[v] }}>
                    {v}
                  </span>
                ))}
              </div>

              <div
                ref={canvasRef}
                className="relative flex-1 min-h-0 rounded-md overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                {[20, 40, 60, 80].map(x => (
                  <div key={x} className="absolute top-0 bottom-0 w-px bg-white/5" style={{ left: `${x}%` }} />
                ))}
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="absolute left-0 right-0 h-px bg-white/5" style={{ top: `${(i * CELL_H).toFixed(2)}%` }} />
                ))}
                <span className="absolute text-[9px] font-medium text-muted-foreground/30 select-none" style={{ top: 6, left: 8 }}>Monitor</span>
                <span className="absolute text-[9px] font-medium text-muted-foreground/30 select-none" style={{ top: 6, right: 8 }}>Manage Closely</span>
                <span className="absolute text-[9px] font-medium text-muted-foreground/30 select-none" style={{ bottom: 6, left: 8 }}>Keep Informed</span>
                <span className="absolute text-[9px] font-medium text-muted-foreground/30 select-none" style={{ bottom: 6, right: 8 }}>Keep Satisfied</span>

                {!loading && (
                  <RelSvg
                    relationships={relationships}
                    stakeholders={stakeholders}
                    canvasW={canvasDims.w}
                    canvasH={canvasDims.h}
                    hoveredRel={hoveredRel}
                    onHover={(idx, e) => {
                      setHoveredRel(idx)
                      setTooltip({ rel: relationships[idx], x: e.clientX, y: e.clientY })
                    }}
                    onLeave={() => { setHoveredRel(null); setTooltip(null) }}
                    onRelClick={rel => openRelPanel(rel)}
                  />
                )}

                {!loading && stakeholders.map(sh => (
                  <StakeholderDot
                    key={sh.id}
                    sh={sh}
                    onClick={s => openShPanel(s)}
                  />
                ))}

                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/50">Lade…</div>
                )}
              </div>

              <div className="text-center text-[9px] uppercase tracking-widest text-muted-foreground/40 mt-1 shrink-0">
                Interest →
              </div>
            </div>
          </div>

          {/* Relationship legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 border-t border-white/10 shrink-0 bg-white/[0.01]">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 mr-1">Beziehungen:</span>
            {REL_TYPES.map(type => {
              const col = REL_COLOR[type]
              const dash = REL_DASH[type]
              return (
                <span key={type} className="flex items-center gap-1.5 text-[10px]" style={{ color: col }}>
                  <svg width="20" height="6">
                    <line x1="0" y1="3" x2="20" y2="3" stroke={col} strokeWidth="2" strokeDasharray={dash} />
                  </svg>
                  {type}
                </span>
              )
            })}
          </div>
        </div>

        {/* ── Side list ── */}
        <div className="w-72 shrink-0 flex flex-col border border-white/10 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.02] shrink-0">
            <span className="text-xs font-semibold">Stakeholder</span>
            <span className="text-[10px] text-muted-foreground/50 font-mono">I = Interest · P = Power</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {loading ? (
              <p className="text-xs text-muted-foreground/50 italic px-4 py-3">Lade…</p>
            ) : stakeholders.length === 0 ? (
              <p className="text-xs text-muted-foreground/50 italic px-4 py-3">Keine Stakeholder für diese Initiative.</p>
            ) : (
              stakeholders.map(sh => {
                const col = sh.color ?? INTEREST_COLOR[sh.interest as InterestValue] ?? '#4f8ef7'
                const intCol = INTEREST_COLOR[sh.interest as InterestValue] ?? '#8b92a8'
                return (
                  <div
                    key={sh.id}
                    className="flex flex-col gap-1.5 px-3 py-2.5 cursor-pointer transition-colors hover:bg-white/[0.05]"
                    onClick={() => openShPanel(sh)}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                        style={{
                          width: 28, height: 28,
                          background: col,
                          borderRadius: sh.type === 'group' ? 4 : '50%',
                          clipPath: sh.type === 'group' ? 'polygon(50% 0%,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)' : undefined,
                        }}
                      >
                        {sh.initials ?? sh.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{sh.name}</div>
                        <div className="text-[10px] text-muted-foreground/60 truncate">
                          {sh.type === 'group' ? `Gruppe · ${sh.group_size ?? '?'} Pers.` : sh.role ?? ''}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex gap-1">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: intCol + '22', color: intCol }}>
                            I {sh.interest}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/[0.06] text-muted-foreground">
                            P {sh.power}
                          </span>
                        </div>
                        <span className="text-[9px] font-medium" style={{ color: intCol }}>
                          {INTEREST_LABEL[sh.interest as InterestValue] ?? ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 pl-9">
                      {sh.rel_to_consultant && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-muted-foreground">{sh.rel_to_consultant}</span>
                      )}
                      {sh.risk_flag && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400">⚠ Risiko</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Relationship tooltip (hover) */}
      {tooltip && <RelTooltip rel={tooltip.rel} x={tooltip.x} y={tooltip.y} />}

      {/* Stakeholder slide-over panel */}
      <StakeholderPanel
        sh={shPanelSh}
        engId={engId}
        customerId={customerId}
        open={shPanelOpen}
        onClose={() => setShPanelOpen(false)}
        onSaved={handleShSaved}
        onDeleted={handleShDeleted}
      />

      {/* Relationship slide-over panel */}
      <RelPanel
        rel={relPanelRel}
        stakeholders={stakeholders}
        engId={engId}
        open={relPanelOpen}
        onClose={() => setRelPanelOpen(false)}
        onSaved={handleRelSaved}
        onDeleted={handleRelDeleted}
      />
    </div>
  )
}
