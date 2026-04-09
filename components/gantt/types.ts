export type MilestoneStatus = 'planned' | 'progress' | 'done' | 'delayed'
export type EngagementStatus = 'active' | 'draft' | 'hold' | 'closed'
export type PeriodKey = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'H1' | 'H2' | 'year'

export interface GanttMilestone {
  id: string
  name: string
  due: string | null
  status: MilestoneStatus
}

export interface GanttEngagement {
  id: string
  name: string
  eng_alias: string | null
  status: EngagementStatus
  start_date: string | null
  end_date: string | null
  milestones: GanttMilestone[]
}

export interface GanttCustomer {
  id: string
  name: string
  engagements: GanttEngagement[]
}

export interface GanttGroup {
  id: string
  name: string
  /** One entry per direct child customer (or self if no children). */
  customers: GanttCustomer[]
}

export const PERIOD_MONTHS: Record<PeriodKey, number[]> = {
  Q1:   [1, 2, 3],
  Q2:   [4, 5, 6],
  Q3:   [7, 8, 9],
  Q4:   [10, 11, 12],
  H1:   [1, 2, 3, 4, 5, 6],
  H2:   [7, 8, 9, 10, 11, 12],
  year: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
}

export const MONTHS_DE = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
]

export const MILESTONE_DOT: Record<MilestoneStatus, string> = {
  planned:  'bg-zinc-400',
  progress: 'bg-sky-400',
  done:     'bg-emerald-500',
  delayed:  'bg-rose-500',
}

export const ENGAGEMENT_BAR: Record<EngagementStatus, string> = {
  active: 'bg-teal/20 border border-teal/50',
  draft:  'bg-muted/50 border border-dashed border-white/20',
  hold:   'bg-amber-500/20 border border-amber-500/50',
  closed: 'bg-muted/30 border border-white/10',
}

export const ENGAGEMENT_STATUS_LABEL: Record<EngagementStatus, string> = {
  active: 'Aktiv',
  draft:  'Entwurf',
  hold:   'On Hold',
  closed: 'Abgeschlossen',
}
