'use client'

import { useState, useCallback, Fragment } from 'react'
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

// ── Droppable cell ────────────────────────────────────────────────
function DroppableCell({
  id,
  tasks,
  engagementName,
  onCardClick,
}: {
  id: string
  tasks: Task[]
  engagementName: string
  onCardClick: (task: Task) => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[80px] rounded-md p-1.5 transition-colors',
        isOver ? 'bg-accent/60' : 'bg-transparent'
      )}
    >
      <div className="flex flex-col gap-1.5">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} engagementName={engagementName} onClick={onCardClick} />
        ))}
      </div>
    </div>
  )
}

// ── Main board ────────────────────────────────────────────────────
interface KanbanBoardProps {
  engagements: Engagement[]
  activeEngagementId: string
  initialTasks: Task[]
}

export function KanbanBoard({
  engagements,
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

  const activeEngagement = engagements.find((e) => e.id === activeEngagementId)
  const engagementName = activeEngagement
    ? (activeEngagement.eng_alias ?? activeEngagement.name)
    : ''

  function getTasksFor(category: TaskCategory, status: TaskStatus) {
    return tasks.filter((t) => t.category === category && t.status === status)
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveTask(tasks.find((t) => t.id === active.id) ?? null)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null)
    if (!over) return

    // Cell id format: "Kommunikation::Backlog"
    const [, newStatus] = (over.id as string).split('::') as [
      TaskCategory,
      TaskStatus,
    ]
    const task = tasks.find((t) => t.id === active.id)
    if (!task || task.status === newStatus) return

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === active.id ? { ...t, status: newStatus } : t
      )
    )

    // Persist
    updateTaskStatus(active.id as string, newStatus).catch(() => {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) =>
          t.id === active.id ? { ...t, status: task.status } : t
        )
      )
    })
  }

  function handleTaskUpdate(updated: Task) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setSelectedTask(null)
  }

  const totalByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status).length

  return (
    <div className="flex flex-col gap-3 min-w-0 flex-1 overflow-hidden">
      {/* Engagement Picker */}
      <div className="flex items-center gap-3 shrink-0">
        <select
          value={activeEngagementId}
          onChange={(e) => router.push(`/kanban?engagement=${e.target.value}`)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {engagements.map((e) => (
            <option key={e.id} value={e.id}>
              {e.customers?.name} — {e.eng_alias ?? e.name}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">
          {tasks.length} Tasks
        </span>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-auto">
          {/* Grid: label col + 4 status cols */}
          <div
            className="grid min-w-[800px]"
            style={{ gridTemplateColumns: '160px repeat(4, 1fr)' }}
          >
            {/* Header row */}
            <div className="sticky top-0 z-10 backdrop-blur-sm bg-background/80 border-b border-white/10 pb-2" />
            {STATUSES.map((status) => (
              <div
                key={status}
                className="sticky top-0 z-10 backdrop-blur-sm bg-background/80 border-b border-white/10 pb-2 px-2"
              >
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold text-foreground">{status}</span>
                  <span className="text-xs text-muted-foreground">
                    {totalByStatus(status)}
                  </span>
                </div>
              </div>
            ))}

            {/* Category rows */}
            {CATEGORIES.map((category, i) => (
              <Fragment key={category}>
                {/* Row label */}
                <div
                  className={cn(
                    'flex items-start pt-2 pr-2',
                    i < CATEGORIES.length - 1 && 'border-b border-white/10'
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                      CATEGORY_COLORS[category]
                    )}
                  >
                    <span>{CATEGORY_ICON[category]}</span>
                    {category}
                  </span>
                </div>

                {/* Status cells */}
                {STATUSES.map((status) => (
                  <div
                    key={`cell-${category}-${status}`}
                    className={cn(
                      'p-1',
                      i < CATEGORIES.length - 1 && 'border-b border-white/10'
                    )}
                  >
                    <DroppableCell
                      id={`${category}::${status}`}
                      tasks={getTasksFor(category, status)}
                      engagementName={engagementName}
                      onCardClick={setSelectedTask}
                    />
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeTask && (
            <div className="rotate-1 opacity-90">
              <TaskCard task={activeTask} engagementName={engagementName} onClick={() => {}} />
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
