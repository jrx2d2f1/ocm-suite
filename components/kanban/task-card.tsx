'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { CalendarDays } from 'lucide-react'
import { type Task, CATEGORY_BORDER } from './types'

interface TaskCardProps {
  task: Task
  engagementName: string
  onClick: (task: Task) => void
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function TaskCard({ task, engagementName, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id })

  const style = { transform: CSS.Translate.toString(transform) }

  const isOverdue =
    task.due &&
    task.status !== 'Done' &&
    new Date(task.due) < new Date()

  const team = task.mitarbeitende ?? []

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onClick(task)}
      className={cn(
        'group relative cursor-pointer rounded-md border border-l-4 bg-card px-3 py-2.5 shadow-sm',
        'hover:shadow-md transition-all select-none touch-none',
        CATEGORY_BORDER[task.category],
        isDragging && 'opacity-40 shadow-lg z-50'
      )}
    >
      {/* Title */}
      <p className="text-sm font-medium leading-snug line-clamp-2">
        {task.title}
      </p>

      {/* Engagement badge */}
      {engagementName && (
        <p className="mt-1 text-[10px] text-muted-foreground truncate">
          {engagementName}
        </p>
      )}

      {/* Footer: date + team avatars */}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        {task.due ? (
          <div
            className={cn(
              'flex items-center gap-1 text-xs',
              isOverdue ? 'text-rose-400' : 'text-muted-foreground'
            )}
          >
            <CalendarDays className="h-3 w-3 shrink-0" />
            {new Date(task.due).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: 'short',
            })}
            {isOverdue && <span className="text-[10px]">· überfällig</span>}
          </div>
        ) : (
          <span />
        )}

        {/* Team avatars */}
        {team.length > 0 && (
          <div className="flex -space-x-1.5">
            {team.slice(0, 3).map((name, i) => (
              <span
                key={i}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-bg-mid text-[9px] font-semibold text-teal ring-1 ring-background"
                title={name}
              >
                {initials(name)}
              </span>
            ))}
            {team.length > 3 && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-bg-mid text-[9px] font-semibold text-muted-foreground ring-1 ring-background">
                +{team.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
