'use client'

import { Fragment, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { FilterSelect } from '@/components/ui/filter-select'
import { updateTaskStatus } from '@/lib/actions/tasks'
import { TaskCard } from './task-card'
import { TaskPanel } from './task-panel'
import {
  type Task,
  type Engagement,
  type TaskStatus,
  type TaskCategory,
  STATUSES,
  CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_ICON,
} from './types'

// ── Status column metadata ────────────────────────────────────────
const STATUS_META: Record<TaskStatus, { dot: string; text: string; cellBg: string }> = {
  'Backlog':     { dot: 'bg-zinc-500',    text: 'text-zinc-300',    cellBg: '' },
  'In Progress': { dot: 'bg-sky-400',     text: 'text-sky-300',     cellBg: 'bg-sky-500/[0.04]' },
  'Review':      { dot: 'bg-amber-400',   text: 'text-amber-300',   cellBg: 'bg-amber-500/[0.04]' },
  'Done':        { dot: 'bg-emerald-500', text: 'text-emerald-300', cellBg: 'bg-emerald-500/[0.05]' },
}

// ── Droppable cell ────────────────────────────────────────────────
function DroppableCell({
  id,
  tasks,
  engagementNameMap,
  onCardClick,
}: {
  id: string
  tasks: Task[]
  engagementNameMap: Record<string, string>
  onCardClick: (task: Task) => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[88px] rounded-lg p-1.5 transition-all',
        isOver
          ? 'bg-white/8 ring-1 ring-inset ring-white/15'
          : 'bg-transparent'
      )}
    >
      <div className="flex flex-col gap-1.5">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            engagementName={engagementNameMap[task.engagement_id] ?? ''}
            onClick={onCardClick}
          />
        ))}
      </div>
    </div>
  )
}

// ── Pill button ───────────────────────────────────────────────────
function Pill({
  active,
  onClick,
  children,
  dot,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  dot?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-all',
        active
          ? 'bg-primary/90 text-primary-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
          : 'bg-white/6 border border-white/10 text-muted-foreground hover:bg-white/10 hover:border-white/20 hover:text-foreground'
      )}
    >
      {dot && !active && <span className={cn('inline-block w-1.5 h-1.5 rounded-full shrink-0', dot)} />}
      {children}
    </button>
  )
}

// ── Main board ────────────────────────────────────────────────────
interface KanbanBoardProps {
  engagements: Engagement[]
  activeCustomerId: string
  activeEngagementId: string
  initialTasks: Task[]
}

export function KanbanBoard({
  engagements,
  activeCustomerId,
  activeEngagementId,
  initialTasks,
}: KanbanBoardProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const engagementNameMap = useMemo(
    () => Object.fromEntries(engagements.map((e) => [e.id, e.eng_alias ?? e.name])),
    [engagements]
  )

  const customers = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>()
    for (const e of engagements) {
      if (e.customers && !seen.has(e.customers.id)) seen.set(e.customers.id, e.customers)
    }
    return Array.from(seen.values())
  }, [engagements])

  const visibleEngagements = useMemo(
    () =>
      activeCustomerId === 'all'
        ? engagements
        : engagements.filter((e) => e.customers?.id === activeCustomerId),
    [engagements, activeCustomerId]
  )

  function selectCustomer(customerId: string) {
    router.push(customerId === 'all' ? '/kanban' : `/kanban?customer=${customerId}`, { scroll: false })
  }

  function selectEngagement(engId: string) {
    const params = new URLSearchParams()
    if (activeCustomerId !== 'all') params.set('customer', activeCustomerId)
    if (engId !== 'all') params.set('engagement', engId)
    const qs = params.toString()
    router.push(qs ? `/kanban?${qs}` : '/kanban', { scroll: false })
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveTask(tasks.find((t) => t.id === active.id) ?? null)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null)
    if (!over) return
    const [, newStatus] = (over.id as string).split('::') as [TaskCategory, TaskStatus]
    const task = tasks.find((t) => t.id === active.id)
    if (!task || task.status === newStatus) return

    setTasks((prev) => prev.map((t) => (t.id === active.id ? { ...t, status: newStatus } : t)))
    updateTaskStatus(active.id as string, newStatus).catch(() => {
      setTasks((prev) => prev.map((t) => (t.id === active.id ? { ...t, status: task.status } : t)))
    })
  }

  function handleTaskUpdate(updated: Task) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setSelectedTask(null)
  }

  function getTasksFor(category: TaskCategory, status: TaskStatus) {
    return tasks.filter((t) => t.category === category && t.status === status)
  }

  const totalByStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status).length

  const statusDot = (status: string) =>
    status === 'active' ? 'bg-emerald-400' :
    status === 'hold'   ? 'bg-amber-400'   : 'bg-zinc-500'

  return (
    <div className="flex flex-col gap-3 min-w-0 flex-1 overflow-hidden">

      {/* ── Filter ── */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <FilterSelect value={activeCustomerId} onChange={selectCustomer}>
          <option value="all">Alle Kunden</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </FilterSelect>

        <FilterSelect value={activeEngagementId} onChange={selectEngagement}>
          <option value="all">Alle Initiativen</option>
          {visibleEngagements.map(e => (
            <option key={e.id} value={e.id}>{e.eng_alias ?? e.name}</option>
          ))}
        </FilterSelect>

        <span className="ml-auto text-sm text-muted-foreground">{tasks.length} Tasks</span>
      </div>

      {/* ── Board ── */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-auto rounded-xl border border-white/8">
          <div
            className="grid min-w-[820px]"
            style={{ gridTemplateColumns: '172px repeat(4, 1fr)' }}
          >
            {/* ── Header row ── */}
            {/* Empty label header */}
            <div className="sticky top-0 z-10 backdrop-blur-md bg-background/85 border-b border-white/10 border-r border-white/10 px-3 py-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                Kategorie
              </span>
            </div>
            {STATUSES.map((status, j) => (
              <div
                key={status}
                className={cn(
                  'sticky top-0 z-10 backdrop-blur-md bg-background/85 border-b border-white/10 px-3 py-2.5',
                  j < STATUSES.length - 1 && 'border-r border-white/10'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn('inline-block w-2 h-2 rounded-full shrink-0', STATUS_META[status].dot)} />
                  <span className={cn('text-sm font-semibold', STATUS_META[status].text)}>
                    {status}
                  </span>
                  <span className="ml-auto text-[11px] tabular-nums bg-white/8 px-1.5 py-0.5 rounded-full text-muted-foreground">
                    {totalByStatus(status)}
                  </span>
                </div>
              </div>
            ))}

            {/* ── Category rows ── */}
            {CATEGORIES.map((category, i) => {
              const categoryCount = tasks.filter((t) => t.category === category).length
              const isLastRow = i === CATEGORIES.length - 1

              return (
                <Fragment key={category}>
                  {/* Row label */}
                  <div
                    className={cn(
                      'flex items-start pt-2.5 px-2 bg-white/[0.02] border-r border-white/10',
                      !isLastRow && 'border-b border-white/8'
                    )}
                  >
                    <div className="flex flex-col gap-1">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                          CATEGORY_COLORS[category]
                        )}
                      >
                        <span>{CATEGORY_ICON[category]}</span>
                        {category}
                      </span>
                      {categoryCount > 0 && (
                        <span className="text-[10px] text-muted-foreground/50 pl-2">
                          {categoryCount} Task{categoryCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status cells */}
                  {STATUSES.map((status, j) => (
                    <div
                      key={`cell-${category}-${status}`}
                      className={cn(
                        'p-1',
                        STATUS_META[status].cellBg,
                        j < STATUSES.length - 1 && 'border-r border-white/8',
                        !isLastRow && 'border-b border-white/8'
                      )}
                    >
                      <DroppableCell
                        id={`${category}::${status}`}
                        tasks={getTasksFor(category, status)}
                        engagementNameMap={engagementNameMap}
                        onCardClick={setSelectedTask}
                      />
                    </div>
                  ))}
                </Fragment>
              )
            })}
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeTask && (
            <div className="rotate-1 opacity-90 scale-[1.02]">
              <TaskCard
                task={activeTask}
                engagementName={engagementNameMap[activeTask.engagement_id] ?? ''}
                onClick={() => {}}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Detail panel */}
      <TaskPanel
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={handleTaskUpdate}
      />
    </div>
  )
}
