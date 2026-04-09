import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/kanban/board'

export default async function KanbanPage({
  searchParams,
}: {
  searchParams: Promise<{ engagement?: string }>
}) {
  const { engagement: engagementId } = await searchParams
  const supabase = await createClient()

  // Org des eingeloggten Users
  const { data: membership } = await supabase
    .from('org_memberships')
    .select('org_id')
    .is('deleted_at', null)
    .single()

  if (!membership) redirect('/login')

  // Alle Engagements (für Picker)
  const { data: engagements } = await supabase
    .from('engagements')
    .select('id, name, eng_alias, status, customers(id, name)')
    .eq('org_id', membership.org_id)
    .is('deleted_at', null)
    .order('created_at')

  if (!engagements?.length) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Kanban</h1>
        <p className="text-sm text-muted-foreground">Keine Engagements vorhanden.</p>
      </div>
    )
  }

  // Ausgewähltes oder erstes aktives Engagement
  const activeId =
    engagementId ??
    (engagements.find((e) => e.status === 'active') ?? engagements[0]).id

  // Tasks für dieses Engagement
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('engagement_id', activeId)
    .is('deleted_at', null)
    .order('sort_order')

  return (
    <div className="flex flex-col gap-4 h-full">
      <h1 className="text-2xl font-semibold tracking-tight shrink-0">Kanban</h1>
      <KanbanBoard
        engagements={engagements as any}
        activeEngagementId={activeId}
        initialTasks={(tasks ?? []) as any}
      />
    </div>
  )
}
