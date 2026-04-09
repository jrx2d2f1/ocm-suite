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
        'group relative cursor-pointer rounded-xl px-3 py-2.5 select-none touch-none',
        'border border-white/10 border-l-4',
        'bg-white/[0.06]',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_2px_6px_rgba(0,0,0,0.18)]',
        'hover:bg-white/[0.11] hover:border-white/[0.18]',
        'hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_14px_rgba(0,0,0,0.25)]',
        'transition-all',
        CATEGORY_BORDER[task.category],
        isDragging && 'opacity-30 scale-[1.02] shadow-xl'
      )}
    >
      {/* Title */}
      <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>

      {/* Engagement badge */}
      {engagementName && (
        <p className="mt-0.5 text-[10px] text-muted-foreground/70 truncate">{engagementName}</p>
      )}

      {/* Owner */}
      {task.owner_name && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[8px] font-bold text-primary shrink-0">
            {initials(task.owner_name)}
          </span>
          <span className="text-[11px] text-muted-foreground truncate">{task.owner_name}</span>
        </div>
      )}

      {/* Footer: date · stakeholders · team */}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        {task.due && (
          <div className={cn('flex items-center gap-1 text-xs', isOverdue ? 'text-rose-400' : 'text-muted-foreground')}>
            <CalendarDays className="h-3 w-3 shrink-0" />
            {new Date(task.due).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: 'short',
              year: '2-digit',
            })}
            {isOverdue && <span className="text-[10px]">· überfällig</span>}
          </div>
        )}

        {/* Team avatars */}
        {team.length > 0 && (
          <div className="flex -space-x-1.5 shrink-0">
            {team.slice(0, 3).map((name, i) => (
              <span
                key={i}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[9px] font-semibold text-teal ring-1 ring-white/20"
                title={name}
              >
                {initials(name)}
              </span>
            ))}
            {team.length > 3 && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/8 text-[9px] font-semibold text-muted-foreground ring-1 ring-white/15">
                +{team.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
