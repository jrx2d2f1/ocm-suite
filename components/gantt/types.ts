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
  planned:  'bg-zinc-400 dark:bg-zinc-500',
  progress: 'bg-blue-500',
  done:     'bg-green-500',
  delayed:  'bg-destructive',
}

export const ENGAGEMENT_BAR: Record<EngagementStatus, string> = {
  active: 'bg-primary/20 border border-primary/50',
  draft:  'bg-muted border border-dashed border-border',
  hold:   'bg-amber-100 border border-amber-400 dark:bg-amber-900/20 dark:border-amber-600',
  closed: 'bg-muted/40 border border-border/40',
}
