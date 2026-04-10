'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Trash2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type StratGoal,
  type StratCustomer,
  type GoalType,
  SMAP_COLS,
  GOAL_COLOR,
} from './types'
import { upsertGoal, updateGoalParents, upsertKeyResults, deleteGoal } from '@/lib/actions/strategy'

interface StratEngagement {
  id: string
  name: string
  eng_alias: string | null
}

interface Props {
  customers: StratCustomer[]
  goals: StratGoal[]
  activeCustomerId: string
  engagements: StratEngagement[]
}

interface ModalState {
  open: boolean
  type: GoalType
  goal: StratGoal | null
}

// Which column type is the parent source for each type
const PARENT_SOURCE: Partial<Record<GoalType, GoalType>> = {
  functional: 'strategic',
  operational: 'functional',
  program: 'operational',
}

function parseProgress(current: string, target: string): number | null {
  if (!current || current === '—' || current === '-' || current === 'In Plan' || current === 'Entwurf') return null
  const cNum = parseFloat(current.replace(',', '.').replace(/[^0-9.]/g, ''))
  const tNum = parseFloat(target.replace(',', '.').replace(/[^0-9.]/g, ''))
  if (isNaN(cNum) || isNaN(tNum) || tNum === 0) return null
  return Math.round((cNum / tNum) * 100)
}

export function StratMapView({ customers, goals, activeCustomerId, engagements }: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<ModalState>({ open: false, type: 'strategic', goal: null })

  function selectCustomer(id: string) {
    router.push(`/strategy?customer=${id}`)
  }

  function openCreate(type: GoalType) {
    setModal({ open: true, type, goal: null })
  }

  function openEdit(goal: StratGoal) {
    setModal({ open: true, type: goal.type, goal })
  }

  function closeModal() {
    setModal(m => ({ ...m, open: false }))
  }

  function handleSaved() {
    closeModal()
    router.refresh()
  }

  // Group goals by type
  const byType = Object.fromEntries(SMAP_COLS.map(col => [col.key, [] as StratGoal[]]))
  for (const g of goals) {
    if (byType[g.type]) byType[g.type].push(g)
  }

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
                  {colGoals.map(goal => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      color={col.dotColor}
                      goalById={goalById}
                      onClick={() => openEdit(goal)}
                      onCanvasOpen={goal.engagement_id
                        ? () => router.push(`/canvas?engagement=${goal.engagement_id}`)
                        : undefined
                      }
                    />
                  ))}

                  {/* Add new goal button */}
                  <button
                    onClick={() => openCreate(col.key)}
                    className="rounded-xl border border-dashed border-white/10 px-3 py-3 text-center text-xs text-muted-foreground/40 hover:text-muted-foreground/70 hover:border-white/20 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus size={11} />
                    {col.addLabel.replace('+ ', '')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Goal edit/create modal */}
      {modal.open && (
        <GoalModal
          type={modal.type}
          goal={modal.goal}
          allGoals={goals}
          engagements={engagements}
          customerId={activeCustomerId}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// GoalCard
// ---------------------------------------------------------------------------

function GoalCard({
  goal,
  color,
  goalById,
  onClick,
  onCanvasOpen,
}: {
  goal: StratGoal
  color: string
  goalById: Record<string, StratGoal>
  onClick: () => void
  onCanvasOpen?: () => void
}) {
  const parentGoals = goal.parent_ids
    .map(pid => goalById[pid])
    .filter(Boolean)

  return (
    <div
      className="rounded-xl p-3.5 border transition-colors cursor-pointer"
      style={{
        background: color + '0d',
        borderColor: color + '33',
      }}
      onClick={onClick}
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
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color, opacity: 0.5 }} />
          <span className="text-[10px] text-muted-foreground">{goal.owner}</span>
        </div>
      )}

      {/* Target date */}
      {goal.target_date && (
        <div className="flex items-center gap-1.5 mt-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color, opacity: 0.35 }} />
          <span className="text-[10px] text-muted-foreground/70">
            Ziel: {new Date(goal.target_date + 'T00:00:00').toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })}
          </span>
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
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: barColor }} />
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
            onClick={e => { e.stopPropagation(); onCanvasOpen() }}
            className="text-[10px] text-primary/80 hover:text-primary transition-colors flex items-center gap-1"
          >
            → Initiative Canvas öffnen
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// GoalModal
// ---------------------------------------------------------------------------

const inputCls =
  'w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm ' +
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 ' +
  'placeholder:text-muted-foreground/50 transition-colors hover:bg-white/[0.07]'

const textareaCls = inputCls + ' resize-none'

interface KRDraft {
  text: string
  current_value: string
  target_value: string
}

function GoalModal({
  type,
  goal,
  allGoals,
  engagements,
  customerId,
  onClose,
  onSaved,
}: {
  type: GoalType
  goal: StratGoal | null
  allGoals: StratGoal[]
  engagements: StratEngagement[]
  customerId: string
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = goal !== null
  const colDef = SMAP_COLS.find(c => c.key === type)!
  const color = colDef.dotColor

  const [title, setTitle] = useState(goal?.title ?? '')
  const [description, setDescription] = useState(goal?.description ?? '')
  const [owner, setOwner] = useState(goal?.owner ?? '')
  const [engagementId, setEngagementId] = useState(goal?.engagement_id ?? '')
  // target_date stored as 'YYYY-MM-DD', month picker needs 'YYYY-MM'
  const [targetMonth, setTargetMonth] = useState(
    goal?.target_date ? goal.target_date.slice(0, 7) : ''
  )
  const [parentIds, setParentIds] = useState<Set<string>>(new Set(goal?.parent_ids ?? []))
  const [krs, setKrs] = useState<KRDraft[]>(
    goal?.key_results.map(kr => ({ text: kr.text, current_value: kr.current_value, target_value: kr.target_value })) ?? []
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const parentSourceType = PARENT_SOURCE[type]
  const parentCandidates = parentSourceType ? allGoals.filter(g => g.type === parentSourceType) : []

  function toggleParent(id: string) {
    setParentIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addKR() {
    setKrs(prev => [...prev, { text: '', current_value: '', target_value: '' }])
  }

  function removeKR(i: number) {
    setKrs(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateKR(i: number, field: keyof KRDraft, value: string) {
    setKrs(prev => prev.map((kr, idx) => idx === i ? { ...kr, [field]: value } : kr))
  }

  function handleSave() {
    if (!title.trim()) { setError('Titel ist erforderlich.'); return }
    if (!customerId) { setError('Kein Kunde ausgewählt.'); return }
    setError(null)
    startTransition(async () => {
      try {
        const goalId = await upsertGoal({
          id: goal?.id,
          customer_id: customerId,
          type,
          title: title.trim(),
          description: description.trim() || null,
          owner: owner.trim() || null,
          engagement_id: type === 'program' ? (engagementId || null) : null,
          target_date: targetMonth ? `${targetMonth}-01` : null,
        })
        await updateGoalParents(goalId, Array.from(parentIds))
        await upsertKeyResults(goalId, krs.filter(kr => kr.text.trim()))
        onSaved()
      } catch (e: any) {
        setError(e.message ?? 'Fehler beim Speichern.')
      }
    })
  }

  function handleDelete() {
    if (!goal) return
    startTransition(async () => {
      try {
        await deleteGoal(goal.id)
        onSaved()
      } catch (e: any) {
        setError(e.message ?? 'Fehler beim Löschen.')
      }
    })
  }

  const modalTitle = isEdit
    ? `${colDef.label.replace(/e$/, '')} bearbeiten`
    : colDef.label.replace(/e$/, '') + ' erstellen'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 shrink-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
          <h2 className="text-sm font-semibold flex-1">{modalTitle}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Titel *
            </label>
            <input
              className={inputCls}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Zielbezeichnung…"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Beschreibung
            </label>
            <textarea
              className={textareaCls}
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optionale Beschreibung…"
            />
          </div>

          {/* Owner */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Verantwortlich
            </label>
            <input
              className={inputCls}
              value={owner}
              onChange={e => setOwner(e.target.value)}
              placeholder="Name, Rolle…"
            />
          </div>

          {/* Target date (month + year) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Zieldatum
            </label>
            <input
              type="month"
              value={targetMonth}
              onChange={e => setTargetMonth(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Engagement link (program type only) */}
          {type === 'program' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Initiative Canvas
              </label>
              <select
                className={inputCls}
                value={engagementId}
                onChange={e => setEngagementId(e.target.value)}
              >
                <option value="">— Keine Verknüpfung —</option>
                {engagements.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.eng_alias ? `${e.eng_alias} · ` : ''}{e.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Parent goals */}
          {parentCandidates.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Übergeordnete Ziele
              </label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {parentCandidates.map(p => {
                  const pColor = GOAL_COLOR[p.type]
                  return (
                    <label key={p.id} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="accent-primary shrink-0"
                        checked={parentIds.has(p.id)}
                        onChange={() => toggleParent(p.id)}
                      />
                      <span
                        className="text-xs leading-snug group-hover:text-foreground transition-colors"
                        style={{ color: parentIds.has(p.id) ? pColor : undefined }}
                      >
                        {p.title}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* Key Results */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Key Results
            </label>

            {krs.length > 0 && (
              <div className="space-y-2">
                {krs.map((kr, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-[1fr_6rem_6rem] gap-1.5">
                      <input
                        className={inputCls}
                        value={kr.text}
                        onChange={e => updateKR(i, 'text', e.target.value)}
                        placeholder="Ergebnis…"
                      />
                      <input
                        className={inputCls}
                        value={kr.current_value}
                        onChange={e => updateKR(i, 'current_value', e.target.value)}
                        placeholder="Ist"
                      />
                      <input
                        className={inputCls}
                        value={kr.target_value}
                        onChange={e => updateKR(i, 'target_value', e.target.value)}
                        placeholder="Ziel"
                      />
                    </div>
                    <button
                      onClick={() => removeKR(i)}
                      className="mt-2 text-muted-foreground/50 hover:text-rose-400 transition-colors shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={addKR}
              className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-primary transition-colors"
            >
              <Plus size={12} />
              Key Result hinzufügen
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-rose-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-white/10 shrink-0">
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="flex items-center gap-1.5 text-xs text-rose-400/70 hover:text-rose-400 transition-colors mr-auto disabled:opacity-50"
            >
              <Trash2 size={13} />
              Ziel löschen
            </button>
          )}
          <button
            onClick={onClose}
            disabled={isPending}
            className="ml-auto px-3.5 py-2 rounded-lg text-xs bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={isPending || !title.trim()}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Wird gespeichert…' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
