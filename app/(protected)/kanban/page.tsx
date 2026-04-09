import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/kanban/board'

export default async function KanbanPage({
  searchParams,
}: {
  searchParams: Promise<{ engagement?: string; customer?: string }>
}) {
  const { engagement: engagementParam, customer: customerParam } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: membership } = await supabase
    .from('org_memberships')
    .select('org_id')
    .eq('user_id', user?.id ?? '')
    .is('deleted_at', null)
    .maybeSingle()

  if (!membership) redirect('/dashboard')

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

  const activeCustomerId = customerParam ?? 'all'
  const activeEngagementId =
    engagementParam && engagementParam !== 'all' ? engagementParam : 'all'

  // Determine which engagement IDs to load tasks for
  const targetIds =
    activeEngagementId !== 'all'
      ? [activeEngagementId]
      : activeCustomerId !== 'all'
      ? engagements
          .filter((e) => (e.customers as any)?.id === activeCustomerId)
          .map((e) => e.id)
      : engagements.map((e) => e.id)

  const { data: tasks } = targetIds.length
    ? await supabase
        .from('tasks')
        .select('*')
        .in('engagement_id', targetIds)
        .is('deleted_at', null)
        .order('sort_order')
    : { data: [] }

  return (
    <div className="flex flex-col gap-4 h-full">
      <h1 className="text-2xl font-semibold tracking-tight shrink-0">Kanban</h1>
      <KanbanBoard
        key={`${activeCustomerId}__${activeEngagementId}`}
        engagements={engagements as any}
        activeCustomerId={activeCustomerId}
        activeEngagementId={activeEngagementId}
        initialTasks={(tasks ?? []) as any}
      />
    </div>
  )
}
