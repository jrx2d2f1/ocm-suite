'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { CalendarDays } from 'lucide-react'
import { type Task, CATEGORY_BORDER } from './types'

interface TaskCardProps {
  task: Task
  onClick: (task: Task) => void
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id })

  const style = { transform: CSS.Translate.toString(transform) }

  const isOverdue =
    task.due &&
    task.status !== 'Done' &&
    new Date(task.due) < new Date()

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onClick(task)}
      className={cn(
        'group relative cursor-pointer rounded-md border border-l-4 bg-card px-3 py-2.5 shadow-sm',
        'hover:shadow-md hover:border-border/80 transition-all',
        'select-none touch-none',
        CATEGORY_BORDER[task.category],
        isDragging && 'opacity-40 shadow-lg z-50'
      )}
    >
      <p className="text-sm font-medium leading-snug line-clamp-2">
        {task.title}
      </p>

      {task.due && (
        <div
          className={cn(
            'mt-1.5 flex items-center gap-1 text-xs',
            isOverdue ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          <CalendarDays className="h-3 w-3" />
          {new Date(task.due).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: 'short',
          })}
          {isOverdue && ' ·  überfällig'}
        </div>
      )}
    </div>
  )
}
