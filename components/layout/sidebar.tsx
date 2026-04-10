'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Kanban,
  FileText,
  Network,
  Target,
  Calendar,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',    label: 'Dashboard',             icon: LayoutDashboard },
  { href: '/kanban',       label: 'Kanban',                icon: Kanban },
  { href: '/canvas',       label: 'Initiative Canvas',     icon: FileText },
  { href: '/stakeholders', label: 'Power/Interest-Matrix', icon: Network },
  { href: '/strategy',     label: 'Strategy Map',          icon: Target },
  { href: '/kalender',     label: 'Kalender',              icon: Calendar },
]

interface SidebarProps {
  userEmail?: string | null
}

function NavTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-[calc(100%+10px)] z-50 whitespace-nowrap rounded-lg border border-white/10 bg-bg-dark/95 px-2.5 py-1.5 text-xs font-medium text-foreground opacity-0 shadow-xl backdrop-blur-sm transition-opacity duration-150 group-hover:opacity-100">
      {label}
    </span>
  )
}

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = userEmail ? userEmail[0].toUpperCase() : '?'

  return (
    <aside className="relative flex h-screen w-16 shrink-0 flex-col items-center border-r border-white/[0.06] bg-bg-dark/70 backdrop-blur-xl py-4 gap-0 z-20">

      {/* Logo */}
      <div className="mb-5 flex h-9 w-9 items-center justify-center shrink-0">
        <span className="select-none text-lg font-bold tracking-tight text-teal">O</span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-1 flex-col items-center gap-1.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex items-center justify-center"
            >
              <span className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150',
                isActive
                  ? 'bg-teal/15 ring-1 ring-teal/30 shadow-[0_0_18px_rgba(109,232,216,0.18)]'
                  : 'bg-white/[0.04] hover:bg-white/[0.09]',
              )}>
                <Icon className={cn(
                  'h-[18px] w-[18px] transition-colors duration-150',
                  isActive
                    ? 'text-teal'
                    : 'text-ci-muted group-hover:text-ci-gray',
                )} />
              </span>
              <NavTooltip label={item.label} />
            </Link>
          )
        })}
      </nav>

      {/* Bottom: avatar + sign-out */}
      <div className="flex flex-col items-center gap-2 shrink-0 pt-2">
        <div
          title={userEmail ?? ''}
          className="flex h-8 w-8 select-none items-center justify-center rounded-full bg-teal/20 text-xs font-bold text-teal ring-1 ring-teal/30"
        >
          {initials}
        </div>

        <button
          onClick={handleSignOut}
          className="group relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] transition-colors duration-150 hover:bg-rose-500/10"
        >
          <LogOut className="h-[18px] w-[18px] text-ci-muted transition-colors group-hover:text-rose-400" />
          <NavTooltip label="Abmelden" />
        </button>
      </div>
    </aside>
  )
}
