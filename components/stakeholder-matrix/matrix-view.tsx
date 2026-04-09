'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
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

interface Engagement {
  id: string
  name: string
  eng_alias: string | null
}

interface Props {
  engagements: Engagement[]
  initialEngagementId: string
}

const INTEREST_VALS: InterestValue[] = ['--', '-', '0', '+', '++']
const CELL_W = 20        // % per interest column
const CELL_H = 100 / 6  // % per power row (~16.67%)
const DOT_MARGIN = 3     // % margin from edges

// ── Compute default positions from power/interest ──────────────────
function computePositions(stakeholders: MatrixStakeholder[]): MatrixStakeholder[] {
  // Group by (interest, power) cell for spread
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

    if (n === 1) {
      return { ...s, posX: cellCX, posY: cellCY }
    }

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

// ── SVG Relationship Layer ─────────────────────────────────────────
function RelSvg({
  relationships,
  stakeholders,
  canvasW,
  canvasH,
  hoveredRel,
  onHover,
  onLeave,
}: {
  relationships: MatrixRelationship[]
  stakeholders: MatrixStakeholder[]
  canvasW: number
  canvasH: number
  hoveredRel: number | null
  onHover: (idx: number, e: React.MouseEvent) => void
  onLeave: () => void
}) {
  if (!canvasW || !canvasH) return null
  const DOT_R = 16

  function dotPos(id: string) {
    const s = stakeholders.find(x => x.id === id)
    if (!s) return null
    return { x: s.posX / 100 * canvasW, y: s.posY / 100 * canvasH }
  }

  const types: RelationshipType[] = ['Sponsor', 'Champion', 'Berichtslinie', 'Peer', 'Influencer', 'Blocker']
  const markerDefs = types.map(type => {
    const col = REL_COLOR[type]
    return (
      <>
        <marker key={`m-${type}`} id={`ra-${type}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M1 1L7 4L1 7" fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        <marker key={`mr-${type}`} id={`ra-${type}-rev`} viewBox="0 0 8 8" refX="1" refY="4" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M7 1L1 4L7 7" fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </>
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
        {/* Thick invisible hit area */}
        <path
          d={d}
          fill="none"
          stroke="rgba(0,0,0,0)"
          strokeWidth={18}
          style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
          onMouseEnter={e => onHover(idx, e)}
          onMouseLeave={onLeave}
        />
        {/* Visible line */}
        <path
          d={d}
          fill="none"
          stroke={col}
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
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 1, pointerEvents: 'all' }}
    >
      <defs>{markerDefs}</defs>
      {paths}
    </svg>
  )
}

// ── Stakeholder Dot ────────────────────────────────────────────────
function StakeholderDot({
  sh,
  onClick,
}: {
  sh: MatrixStakeholder
  onClick: (sh: MatrixStakeholder) => void
}) {
  const col = sh.color ?? INTEREST_COLOR[sh.interest as InterestValue] ?? '#4f8ef7'
  const size = sh.type === 'group' ? 36 : 30

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{
        left: `${sh.posX}%`,
        top: `${sh.posY}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 4,
        cursor: 'pointer',
      }}
      onClick={() => onClick(sh)}
    >
      {/* Risk ring */}
      {sh.risk_flag && (
        <div
          className="absolute rounded-full border-2 border-dashed border-rose-500"
          style={{ width: size + 10, height: size + 10, top: -5, left: -5 }}
        />
      )}

      {/* Dot shape */}
      <div
        className="flex items-center justify-center text-[9px] font-bold text-white select-none"
        title={`${sh.name} · I: ${sh.interest} · P: ${sh.power}`}
        style={{
          width: size,
          height: size,
          background: col,
          borderRadius: sh.type === 'group' ? '4px' : '50%',
          clipPath: sh.type === 'group'
            ? 'polygon(50% 0%,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)'
            : undefined,
          boxShadow: `0 0 0 2px #1E2B32, 0 2px 8px ${col}60`,
        }}
      >
        {sh.initials ?? sh.name.slice(0, 2).toUpperCase()}
      </div>
    </div>
  )
}

// ── Tooltip ─────────────────────────────────────────────────────────
function RelTooltip({
  rel,
  x,
  y,
}: {
  rel: MatrixRelationship
  x: number
  y: number
}) {
  const col = REL_COLOR[rel.type] ?? '#8b92a8'
  const arrow = rel.bidirectional ? '↔' : '→'
  return (
    <div
      className="fixed z-50 pointer-events-none rounded-lg border border-white/10 bg-background/95 backdrop-blur-sm px-3 py-2.5 shadow-xl text-xs"
      style={{ left: x + 14, top: y - 10, maxWidth: 220 }}
    >
      <div className="font-semibold text-foreground mb-1">
        {rel.from_name} {arrow} {rel.to_name}
      </div>
      <span
        className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded mb-1"
        style={{ background: col + '22', color: col }}
      >
        {rel.type}
      </span>
      <div className="flex gap-0.5 my-1">
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: i < rel.strength ? col : 'rgba(255,255,255,0.1)' }}
          />
        ))}
      </div>
      {rel.notes && <div className="text-muted-foreground/80 mt-1 leading-relaxed">{rel.notes}</div>}
    </div>
  )
}

// ── Main MatrixView ────────────────────────────────────────────────
export function MatrixView({ engagements, initialEngagementId }: Props) {
  const router = useRouter()
  const [engId, setEngId] = useState(initialEngagementId)
  const [stakeholders, setStakeholders] = useState<MatrixStakeholder[]>([])
  const [relationships, setRelationships] = useState<MatrixRelationship[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSh, setSelectedSh] = useState<MatrixStakeholder | null>(null)
  const [hoveredRel, setHoveredRel] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<{ rel: MatrixRelationship; x: number; y: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [canvasDims, setCanvasDims] = useState({ w: 0, h: 0 })

  // Measure canvas size for SVG
  useEffect(() => {
    if (!canvasRef.current) return
    const obs = new ResizeObserver(entries => {
      const r = entries[0].contentRect
      setCanvasDims({ w: r.width, h: r.height })
    })
    obs.observe(canvasRef.current)
    return () => obs.disconnect()
  }, [])

  // Load stakeholders + relationships when engagement changes
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
      // Build stakeholder list from profiles
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
          posX: 0,
          posY: 0,
        }
      })
      setStakeholders(computePositions(raw))

      // Build relationship name lookup
      const shMap = Object.fromEntries(raw.map(s => [s.id, s.name]))
      const rels: MatrixRelationship[] = (relsRes.data ?? []).map(r => ({
        id: r.id,
        from_id: r.from_id,
        to_id: r.to_id,
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

  function selectEngagement(id: string) {
    setEngId(id)
    setSelectedSh(null)
    router.push(`/stakeholders?engagement=${id}`, { scroll: false })
  }

  const intColor = selectedSh ? INTEREST_COLOR[selectedSh.interest] ?? '#8b92a8' : '#8b92a8'
  const intLabel = selectedSh ? INTEREST_LABEL[selectedSh.interest] ?? '' : ''

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">

      {/* Toolbar */}
      <div className="flex items-center gap-3 shrink-0 flex-wrap">
        <span className="text-xs text-muted-foreground">Initiative:</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {engagements.map(e => (
            <button
              key={e.id}
              onClick={() => selectEngagement(e.id)}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                engId === e.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              )}
            >
              {e.eng_alias ?? e.name}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="ml-auto flex items-center gap-4 text-[10px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 rounded-full bg-primary/60" />
            Person
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 bg-amber-400/80" style={{ clipPath: 'polygon(50% 0%,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)' }} />
            Gruppe
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-dashed border-rose-500" />
            Risiko
          </span>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">

        {/* ── Matrix canvas ── */}
        <div className="flex-1 min-w-0 flex flex-col border border-white/10 rounded-lg overflow-hidden">

          {/* Title + axis hint */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 shrink-0 bg-white/[0.02]">
            <span className="text-xs font-semibold text-muted-foreground">
              {engagements.find(e => e.id === engId)?.name ?? ''}
            </span>
            <span className="text-[10px] text-muted-foreground/50">
              Hover für Details
            </span>
          </div>

          {/* Y-label + grid area */}
          <div className="flex flex-1 min-h-0 p-3 gap-2">
            {/* Y-axis labels (Power) */}
            <div className="flex flex-col justify-between pb-6 w-5 shrink-0 text-right">
              {[5, 4, 3, 2, 1, 0].map(p => (
                <span key={p} className="text-[10px] font-mono text-muted-foreground/60">{p}</span>
              ))}
            </div>

            {/* Grid + dots */}
            <div className="flex flex-col flex-1 min-w-0">
              {/* X-axis labels (Interest) */}
              <div className="flex justify-between px-0 pb-1 shrink-0">
                {INTEREST_VALS.map(v => (
                  <span key={v} className="flex-1 text-center text-[10px] font-mono font-semibold" style={{ color: INTEREST_COLOR[v] }}>
                    {v}
                  </span>
                ))}
              </div>

              {/* Main canvas */}
              <div
                ref={canvasRef}
                className="relative flex-1 min-h-0 rounded-md overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                {/* Grid lines */}
                {[20, 40, 60, 80].map(x => (
                  <div key={x} className="absolute top-0 bottom-0 w-px bg-white/5" style={{ left: `${x}%` }} />
                ))}
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="absolute left-0 right-0 h-px bg-white/5" style={{ top: `${(i * CELL_H).toFixed(2)}%` }} />
                ))}

                {/* Quadrant labels */}
                <span className="absolute text-[9px] font-medium text-muted-foreground/30 select-none" style={{ top: 6, left: 8 }}>Monitor</span>
                <span className="absolute text-[9px] font-medium text-muted-foreground/30 select-none" style={{ top: 6, right: 8 }}>Manage Closely</span>
                <span className="absolute text-[9px] font-medium text-muted-foreground/30 select-none" style={{ bottom: 6, left: 8 }}>Keep Informed</span>
                <span className="absolute text-[9px] font-medium text-muted-foreground/30 select-none" style={{ bottom: 6, right: 8 }}>Keep Satisfied</span>

                {/* SVG relationship layer */}
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
                  />
                )}

                {/* Stakeholder dots */}
                {!loading && stakeholders.map(sh => (
                  <StakeholderDot
                    key={sh.id}
                    sh={sh}
                    onClick={s => setSelectedSh(prev => prev?.id === s.id ? null : s)}
                  />
                ))}

                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/50">
                    Lade…
                  </div>
                )}
              </div>

              {/* X-axis label */}
              <div className="text-center text-[9px] uppercase tracking-widest text-muted-foreground/40 mt-1 shrink-0">
                Interest →
              </div>
            </div>
          </div>

          {/* Relationship legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 border-t border-white/10 shrink-0 bg-white/[0.01]">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 mr-1">
              Beziehungen:
            </span>
            {(['Sponsor', 'Champion', 'Berichtslinie', 'Influencer', 'Peer', 'Blocker'] as RelationshipType[]).map(type => {
              const col = REL_COLOR[type]
              const dash = REL_DASH[type]
              return (
                <span key={type} className="flex items-center gap-1.5 text-[10px]" style={{ color: col }}>
                  <svg width="20" height="6">
                    <line
                      x1="0" y1="3" x2="20" y2="3"
                      stroke={col}
                      strokeWidth="2"
                      strokeDasharray={dash}
                    />
                  </svg>
                  {type}
                </span>
              )
            })}
          </div>
        </div>

        {/* ── Side list panel ── */}
        <div className="w-72 shrink-0 flex flex-col border border-white/10 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.02] shrink-0">
            <span className="text-xs font-semibold">Stakeholder</span>
            <span className="text-[10px] text-muted-foreground/50 font-mono">I = Interest · P = Power</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {loading ? (
              <p className="text-xs text-muted-foreground/50 italic px-4 py-3">Lade…</p>
            ) : stakeholders.length === 0 ? (
              <p className="text-xs text-muted-foreground/50 italic px-4 py-3">
                Keine Stakeholder für diese Initiative.
              </p>
            ) : (
              stakeholders.map(sh => {
                const col = sh.color ?? INTEREST_COLOR[sh.interest as InterestValue] ?? '#4f8ef7'
                const intCol = INTEREST_COLOR[sh.interest as InterestValue] ?? '#8b92a8'
                const isSelected = selectedSh?.id === sh.id
                return (
                  <div
                    key={sh.id}
                    className={cn(
                      'flex flex-col gap-1.5 px-3 py-2.5 cursor-pointer transition-colors',
                      isSelected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                    )}
                    onClick={() => setSelectedSh(prev => prev?.id === sh.id ? null : sh)}
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Avatar */}
                      <div
                        className="flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                        style={{
                          width: 28,
                          height: 28,
                          background: col,
                          borderRadius: sh.type === 'group' ? 4 : '50%',
                          clipPath: sh.type === 'group'
                            ? 'polygon(50% 0%,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)'
                            : undefined,
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

                      {/* Badges */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex gap-1">
                          <span
                            className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                            style={{ background: intCol + '22', color: intCol }}
                          >
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

                    {/* Rel badge + risk */}
                    <div className="flex items-center gap-1.5 pl-9">
                      {sh.rel_to_consultant && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-muted-foreground">
                          {sh.rel_to_consultant}
                        </span>
                      )}
                      {sh.risk_flag && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400">
                          ⚠ Risiko
                        </span>
                      )}
                    </div>

                    {/* Detail expand */}
                    {isSelected && (
                      <div className="pl-9 mt-0.5 space-y-1">
                        {sh.role && sh.type === 'person' && (
                          <div className="text-[10px] text-muted-foreground/70">{sh.role}</div>
                        )}
                        <div
                          className="text-[10px] font-semibold"
                          style={{ color: intCol }}
                        >
                          {intLabel}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>

      {/* Relationship tooltip */}
      {tooltip && <RelTooltip rel={tooltip.rel} x={tooltip.x} y={tooltip.y} />}
    </div>
  )
}
