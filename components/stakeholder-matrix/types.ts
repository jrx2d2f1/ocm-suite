export type InterestValue = '--' | '-' | '0' | '+' | '++'
export type RelationshipType = 'Sponsor' | 'Champion' | 'Berichtslinie' | 'Peer' | 'Influencer' | 'Blocker'

export interface MatrixStakeholder {
  id: string
  name: string
  type: 'person' | 'group'
  role: string | null
  initials: string | null
  color: string | null
  group_size: number | null
  power: number
  interest: InterestValue
  risk_flag: boolean
  rel_to_consultant: string | null
  posX: number
  posY: number
}

export interface MatrixRelationship {
  id: string
  from_id: string
  to_id: string
  from_name: string
  to_name: string
  type: RelationshipType
  strength: number
  bidirectional: boolean
  notes: string | null
}

// X position on canvas (%) for each interest value
export const INTEREST_X: Record<InterestValue, number> = {
  '--': 10, '-': 28, '0': 46, '+': 64, '++': 82,
}

// Y position on canvas (%) for each power value (0=bottom=91%, 5=top=9%)
export const POWER_Y: Record<number, number> = {
  0: 91, 1: 74, 2: 58, 3: 41, 4: 25, 5: 9,
}

export const INTEREST_COLOR: Record<InterestValue, string> = {
  '--': '#f43f5e', '-': '#fb923c', '0': '#f59e0b', '+': '#86efac', '++': '#22c55e',
}

export const INTEREST_LABEL: Record<InterestValue, string> = {
  '--': 'Gegner', '-': 'Skeptiker', '0': 'Neutral', '+': 'Befürworter', '++': 'Unterstützer',
}

export const REL_COLOR: Record<RelationshipType, string> = {
  Sponsor:      '#22c55e',
  Champion:     '#86efac',
  Berichtslinie:'#4f8ef7',
  Peer:         '#a78bfa',
  Influencer:   '#f59e0b',
  Blocker:      '#f43f5e',
}

export const REL_DASH: Partial<Record<RelationshipType, string>> = {
  Berichtslinie: '5,3',
  Peer:          '3,3',
  Influencer:    '6,2',
  Blocker:       '4,2',
}
