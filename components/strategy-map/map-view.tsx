'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  type StratGoal,
  type StratCustomer,
  SMAP_COLS,
  GOAL_COLOR,
} from './types'

interface Props {
  customers: StratCustomer[]
  goals: StratGoal[]
  activeCustomerId: string
}

function parseProgress(current: string, target: string): number | null {
  if (!current || current === '—' || current === '-' || current === 'In Plan' || current === 'Entwurf') return null
  const cNum = parseFloat(current.replace(',', '.').replace(/[^0-9.]/g, ''))
  const tNum = parseFloat(target.replace(',', '.').replace(/[^0-9.]/g, ''))
  if (isNaN(cNum) || isNaN(tNum) || tNum === 0) return null
  return Math.round((cNum / tNum) * 100)
}

export function StratMapView({ customers, goals, activeCustomerId }: Props) {
  const router = useRouter()

  function selectCustomer(id: string) {
    router.push(`/strategy?customer=${id}`)
  }

  // Group goals by type
  const byType = Object.fromEntries(SMAP_COLS.map(col => [col.key, [] as StratGoal[]]))
  for (const g of goals) {
    if (byType[g.type]) byType[g.type].push(g)
  }

  // Build lookup for parent names
  const goalById = Object.fromEntries(goals.map(g => [g.id, g]))

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">

      {/* Toolbar */}
      <div className="flex items-center gap-3 shrink-0 flex-wrap">
        <span className="text-xs text-muted-foreground">Unternehmen:</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {customers.map(c => (
            <button
              key={c.id}
              onClick={() => selectCustomer(c.id)}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                activeCustomerId === c.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
        {goals.length === 0 && (
          <span className="ml-auto text-xs text-muted-foreground">Keine Ziele vorhanden.</span>
        )}
      </div>

      {/* 4-column Strategy Map grid */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="grid gap-5 min-w-[860px] pb-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {SMAP_COLS.map(col => {
            const colGoals = byType[col.key] ?? []
            return (
              <div key={col.key}>
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ background: col.dotColor }}
                  />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.8px]">
                    {col.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 font-normal ml-0.5">
                    ({colGoals.length})
                  </span>
                </div>

                {/* Goal cards */}
                <div className="flex flex-col gap-2.5">
                  {colGoals.map(goal => {
                    const col_color = col.dotColor
                    return (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        color={col_color}
                        goalById={goalById}
                        onCanvasOpen={goal.engagement_id
                          ? () => router.push(`/canvas?engagement=${goal.engagement_id}`)
                          : undefined
                        }
                      />
                    )
                  })}

                  {colGoals.length === 0 && (
                    <div className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-xs text-muted-foreground/40">
                      {col.addLabel}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function GoalCard({
  goal,
  color,
  goalById,
  onCanvasOpen,
}: {
  goal: StratGoal
  color: string
  goalById: Record<string, StratGoal>
  onCanvasOpen?: () => void
}) {
  const parentGoals = goal.parent_ids
    .map(pid => goalById[pid])
    .filter(Boolean)

  return (
    <div
      className="rounded-xl p-3.5 border transition-colors cursor-default"
      style={{
        background: color + '0d',
        borderColor: color + '33',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = color + '66')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = color + '33')}
    >
      {/* Title */}
      <div className="text-sm font-medium text-foreground leading-snug">{goal.title}</div>

      {/* Description */}
      {goal.description && (
        <div className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
          {goal.description}
        </div>
      )}

      {/* Parent badges */}
      {parentGoals.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {parentGoals.map(p => {
            const pColor = GOAL_COLOR[p.type] ?? '#8b92a8'
            return (
              <span
                key={p.id}
                className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: pColor + '22', color: pColor }}
                title={p.title}
              >
                {p.title.length > 22 ? p.title.slice(0, 20) + '…' : p.title}
              </span>
            )
          })}
        </div>
      )}

      {/* Owner */}
      {goal.owner && (
        <div className="flex items-center gap-1.5 mt-2">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: color, opacity: 0.5 }}
          />
          <span className="text-[10px] text-muted-foreground">{goal.owner}</span>
        </div>
      )}

      {/* Key Results */}
      {goal.key_results.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t space-y-1.5" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          {goal.key_results.map(kr => {
            const pct = parseProgress(kr.current_value, kr.target_value)
            const barColor = pct === null
              ? 'var(--border)'
              : pct >= 100 ? '#10b981'
              : pct >= 50  ? '#f59e0b'
              : '#f43f5e'
            return (
              <div key={kr.id}>
                <div className="flex items-baseline justify-between gap-1 mb-0.5">
                  <span className="text-[10px] text-muted-foreground leading-tight truncate">{kr.text}</span>
                  <span className="text-[10px] text-foreground/80 shrink-0 tabular-nums">
                    {kr.current_value}
                    <span className="text-muted-foreground/50"> / {kr.target_value}</span>
                  </span>
                </div>
                {pct !== null ? (
                  <div className="h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, pct)}%`, background: barColor }}
                    />
                  </div>
                ) : (
                  <div className="h-[3px] rounded-full bg-white/[0.06]" />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Canvas link for program type */}
      {onCanvasOpen && (
        <div className="mt-2.5 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <button
            onClick={onCanvasOpen}
            className="text-[10px] text-primary/80 hover:text-primary transition-colors flex items-center gap-1"
          >
            → Initiative Canvas öffnen
          </button>
        </div>
      )}
    </div>
  )
}
