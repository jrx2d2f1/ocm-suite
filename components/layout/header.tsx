'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { User } from '@supabase/supabase-js'

interface HeaderProps {
  user: User
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-end border-b border-bg-mid px-6 gap-3">
      <span className="text-sm text-muted-foreground">{user.email}</span>
      <Button variant="ghost" size="sm" onClick={handleSignOut}>
        Abmelden
      </Button>
    </header>
  )
}
