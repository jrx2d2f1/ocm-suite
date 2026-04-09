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

export const CATEGORY_COLORS: Record<TaskCategory, string> = {
  Kommunikation: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  Enablement:    'bg-green-500/15 text-green-700 dark:text-green-400',
  Sounding:      'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  Sponsoring:    'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  Reporting:     'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
  Erwartung:     'bg-red-500/15 text-red-700 dark:text-red-400',
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
  Backlog:      'text-zinc-500',
  'In Progress':'text-blue-600',
  Review:       'text-amber-600',
  Done:         'text-green-600',
}
