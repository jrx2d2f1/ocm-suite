'use client'

import { ChevronDown } from 'lucide-react'

interface FilterSelectProps {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}

export function FilterSelect({ value, onChange, children }: FilterSelectProps) {
  return (
    <div className="relative inline-flex">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-white/10 bg-muted/50 pl-3 pr-8 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-white/30 cursor-pointer hover:bg-muted/70 transition-colors"
        style={{ colorScheme: 'dark' }}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
    </div>
  )
}
