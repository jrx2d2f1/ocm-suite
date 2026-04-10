'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { TaskPanel } from '@/components/kanban/task-panel'
import { type Task } from '@/components/kanban/types'

interface CalEngagement {
  id: string
  name: string
  eng_alias: string | null
}

interface CalTask {
  id: string
  title: string
  category: string
  due: string
  engagement_id: string
}

interface Props {
  engagements: CalEngagement[]
  tasks: CalTask[]
  activeEngagementId: string
  year: number
  month: number // 0-indexed
}

const CATEGORY_COLOR: Record<string, string> = {
  Kommunikation: '#3b82f6',
  Enablement:    '#10b981',
  Sounding:      '#8b5cf6',
  Sponsoring:    '#f97316',
  Reporting:     '#71717a',
  Erwartung:     '#ef4444',
}

const MONTHS_DE = [
  'Januar','Februar','März','April','Mai','Juni',
  'Juli','August','September','Oktober','November','Dezember',
]
const DOW = ['Mo','Di','Mi','Do','Fr','Sa','So']

export function CalendarView({ engagements, tasks, activeEngagementId, year, month }: Props) {
  const router = useRouter()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  function monthStr(y: number, m: number) {
    return `${y}-${String(m + 1).padStart(2, '0')}`
  }

  function navigate(delta: number) {
    let m = month + delta
    let y = year
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    const qs = new URLSearchParams()
    qs.set('month', monthStr(y, m))
    if (activeEngagementId !== 'all') qs.set('engagement', activeEngagementId)
    router.push(`/kalender?${qs}`)
  }

  function selectEngagement(id: string) {
    const qs = new URLSearchParams()
    qs.set('month', monthStr(year, month))
    if (id !== 'all') qs.set('engagement', id)
    router.push(`/kalender?${qs}`)
  }

  async function openTask(taskId: string) {
    if (loadingId) return
    setLoadingId(taskId)
    const supabase = createClient()
    const { data } = await supabase
      .from('tasks')
      .select('id, engagement_id, milestone_id, title, status, category, due, owner_user_id, owner_name, beschreibung, ziel, mitarbeitende, goal_id, sort_order, task_stakeholders(stakeholder_id, role_in_task, stakeholders(id, name, stakeholder_type))')
      .eq('id', taskId)
      .single()
    setLoadingId(null)
    if (data) setSelectedTask(data as unknown as Task)
  }

  function handleUpdate(updated: Task) {
    setSelectedTask(updated)
    router.refresh()
  }

  // Build task map keyed by YYYY-MM-DD
  const taskMap: Record<string, CalTask[]> = {}
  tasks.forEach(t => {
    if (!t.due) return
    if (!taskMap[t.due]) taskMap[t.due] = []
    taskMap[t.due].push(t)
  })

  const firstDay = new Date(year, month, 1)
  const startDow = (firstDay.getDay() + 6) % 7 // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev  = new Date(year, month, 0).getDate()
  const today = new Date()

  type Cell = { day: number; m: number; y: number; other: boolean; isToday: boolean; dateStr: string }
  const cells: Cell[] = []
  for (let i = 0; i < 42; i++) {
    let day: number, m: number, y: number, other = false
    if (i < startDow) {
      day = daysInPrev - startDow + 1 + i; m = month - 1; y = year
      if (m < 0) { m = 11; y-- }; other = true
    } else if (i - startDow < daysInMonth) {
      day = i - startDow + 1; m = month; y = year
    } else {
      day = i - startDow - daysInMonth + 1; m = month + 1; y = year
      if (m > 11) { m = 0; y++ }; other = true
    }
    const isToday = y === today.getFullYear() && m === today.getMonth() && day === today.getDate()
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ day, m, y, other, isToday, dateStr })
  }

  const engMap = Object.fromEntries(engagements.map(e => [e.id, e.eng_alias ?? e.name]))

  // Determine how many rows needed (5 or 6)
  const rowCount = Math.ceil((startDow + daysInMonth) / 7)

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">

      {/* Controls */}
      <div className="flex items-center gap-3 shrink-0 flex-wrap">
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="p-1 rounded hover:bg-muted transition-colors"
            aria-label="Vormonat"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold w-40 text-center tabular-nums">
            {MONTHS_DE[month]} {year}
          </span>
          <button
            onClick={() => navigate(1)}
            className="p-1 rounded hover:bg-muted transition-colors rotate-180"
            aria-label="Nächster Monat"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="h-4 border-l border-white/10" />

        <select
          value={activeEngagementId}
          onChange={e => selectEngagement(e.target.value)}
          className="rounded-lg border border-white/10 bg-muted/50 px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-white/30 cursor-pointer hover:bg-muted/70 transition-colors"
        >
          <option value="all">Alle Initiativen</option>
          {engagements.map(e => (
            <option key={e.id} value={e.id}>{e.eng_alias ?? e.name}</option>
          ))}
        </select>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 min-h-0 border border-white/10 rounded-lg overflow-hidden flex flex-col">

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-white/10 shrink-0 bg-background/80">
          {DOW.map(d => (
            <div
              key={d}
              className="py-2 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-widest border-r border-white/5 last:border-r-0"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div
          className="flex-1 grid grid-cols-7 divide-x divide-y divide-white/5"
          style={{ gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))` }}
        >
          {cells.slice(0, rowCount * 7).map((cell, i) => {
            const dayTasks = taskMap[cell.dateStr] ?? []
            return (
              <div
                key={i}
                className={cn(
                  'p-1.5 flex flex-col gap-0.5 overflow-hidden',
                  cell.other && 'bg-muted/[0.04]',
                  cell.isToday && 'bg-primary/[0.04]',
                )}
              >
                <span className={cn(
                  'text-xs font-medium self-start w-5 h-5 flex items-center justify-center rounded-full shrink-0',
                  cell.isToday
                    ? 'bg-primary text-primary-foreground'
                    : cell.other
                    ? 'text-muted-foreground/30'
                    : 'text-muted-foreground/70'
                )}>
                  {cell.day}
                </span>
                {dayTasks.slice(0, 3).map(t => {
                  const col = CATEGORY_COLOR[t.category] ?? '#8b92a8'
                  const alias = engMap[t.engagement_id] ?? ''
                  const isLoading = loadingId === t.id
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        'rounded px-1.5 py-0.5 cursor-pointer hover:brightness-125 transition-all',
                        isLoading && 'opacity-50'
                      )}
                      style={{ background: col + '22', borderLeft: `2px solid ${col}` }}
                      title={`${t.title}${alias ? ' · ' + alias : ''}`}
                      onClick={() => openTask(t.id)}
                    >
                      <div className="text-[10px] font-medium truncate leading-tight" style={{ color: col }}>
                        {t.title}
                      </div>
                      {alias && (
                        <div className="text-[9px] truncate leading-tight" style={{ color: col, opacity: 0.65 }}>
                          {alias}
                        </div>
                      )}
                    </div>
                  )
                })}
                {dayTasks.length > 3 && (
                  <span className="text-[9px] text-muted-foreground/40 pl-0.5">
                    +{dayTasks.length - 3} weitere
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Task detail panel (same as Kanban) */}
      <TaskPanel
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={handleUpdate}
      />
    </div>
  )
}
