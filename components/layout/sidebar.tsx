'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Kanban,
  FileText,
  Network,
  Target,
  Calendar,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard',           icon: LayoutDashboard },
  { href: '/kanban',    label: 'Kanban',              icon: Kanban },
  { href: '/canvas',   label: 'Initiative Canvas',    icon: FileText },
  { href: '/stakeholders', label: 'Power/Interest-Matrix', icon: Network },
  { href: '/strategy', label: 'Strategy Map',         icon: Target },
  { href: '/kalender', label: 'Kalender',             icon: Calendar },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-bg-mid bg-bg-dark">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-bg-mid px-5 gap-2">
        <span className="text-teal font-bold tracking-tight">OCM</span>
        <span className="text-ci-gray font-semibold tracking-tight">Suite</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-bg-mid text-teal'
                  : 'text-ci-muted hover:bg-bg-mid hover:text-teal'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
