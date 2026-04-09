export type TaskStatus = 'Backlog' | 'In Progress' | 'Review' | 'Done'
export type TaskCategory =
  | 'Kommunikation'
  | 'Enablement'
  | 'Sounding'
  | 'Sponsoring'
  | 'Reporting'
  | 'Erwartung'

export interface Task {
  id: string
  engagement_id: string
  milestone_id: string | null
  title: string
  status: TaskStatus
  category: TaskCategory
  due: string | null
  owner_user_id: string | null
  beschreibung: string | null
  ziel: string | null
  mitarbeitende: string[] | null
  goal_id: string | null
  sort_order: number
}

export interface Engagement {
  id: string
  name: string
  eng_alias: string | null
  status: string
  customers: { id: string; name: string } | null
}

export const STATUSES: TaskStatus[] = ['Backlog', 'In Progress', 'Review', 'Done']

export const CATEGORIES: TaskCategory[] = [
  'Kommunikation',
  'Enablement',
  'Sounding',
  'Sponsoring',
  'Reporting',
  'Erwartung',
]

export const CATEGORY_ICON: Record<TaskCategory, string> = {
  Kommunikation: '💬',
  Enablement:    '📚',
  Sounding:      '🔍',
  Sponsoring:    '🤝',
  Reporting:     '📋',
  Erwartung:     '🎯',
}

export const CATEGORY_COLORS: Record<TaskCategory, string> = {
  Kommunikation: 'bg-sky-500/20 text-sky-300',
  Enablement:    'bg-emerald-500/20 text-emerald-300',
  Sounding:      'bg-violet-500/20 text-violet-300',
  Sponsoring:    'bg-orange-500/20 text-orange-300',
  Reporting:     'bg-slate-500/20 text-slate-300',
  Erwartung:     'bg-rose-500/20 text-rose-300',
}

export const CATEGORY_BORDER: Record<TaskCategory, string> = {
  Kommunikation: 'border-l-blue-500',
  Enablement:    'border-l-green-500',
  Sounding:      'border-l-purple-500',
  Sponsoring:    'border-l-orange-500',
  Reporting:     'border-l-zinc-400',
  Erwartung:     'border-l-red-500',
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  Backlog:      'text-slate-400',
  'In Progress':'text-sky-400',
  Review:       'text-amber-400',
  Done:         'text-emerald-400',
}
