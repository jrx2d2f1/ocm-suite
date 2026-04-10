export type GoalType = 'strategic' | 'functional' | 'operational' | 'program'

export interface KeyResult {
  id: string
  goal_id: string
  text: string
  current_value: string
  target_value: string
  sort_order: number
}

export interface StratGoal {
  id: string
  type: GoalType
  title: string
  description: string | null
  owner: string | null
  engagement_id: string | null
  target_date: string | null  // ISO date 'YYYY-MM-DD', month precision
  sort_order: number
  key_results: KeyResult[]
  parent_ids: string[]
}

export interface StratCustomer {
  id: string
  name: string
}

export const SMAP_COLS: Array<{
  key: GoalType
  label: string
  dotColor: string
  addLabel: string
}> = [
  { key: 'strategic',   label: 'Strategische Ziele', dotColor: '#4f8ef7', addLabel: '+ Strategisches Ziel' },
  { key: 'functional',  label: 'Funktionale Ziele',  dotColor: '#a78bfa', addLabel: '+ Funktionales Ziel' },
  { key: 'operational', label: 'Operative Ziele',    dotColor: '#f59e0b', addLabel: '+ Operatives Ziel' },
  { key: 'program',     label: 'Programme',           dotColor: '#22c55e', addLabel: '+ Programm' },
]

export const GOAL_COLOR: Record<GoalType, string> = {
  strategic:   '#4f8ef7',
  functional:  '#a78bfa',
  operational: '#f59e0b',
  program:     '#22c55e',
}
