import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StratMapView } from '@/components/strategy-map/map-view'
import { type StratGoal, type StratCustomer } from '@/components/strategy-map/types'

export default async function StrategyPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>
}) {
  const { customer: customerParam } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: membership } = await supabase
    .from('org_memberships')
    .select('org_id')
    .eq('user_id', user?.id ?? '')
    .is('deleted_at', null)
    .maybeSingle()

  if (!membership) redirect('/dashboard')

  // Load all customers for this org
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name')
    .eq('org_id', membership.org_id)
    .is('deleted_at', null)
    .order('name')

  const activeCustomerId = customerParam ?? customers?.[0]?.id ?? ''

  // Load goals with key results for the selected customer
  const { data: rawGoals } = activeCustomerId
    ? await supabase
        .from('strategy_goals')
        .select('id, type, title, description, owner, engagement_id, sort_order, key_results(id, goal_id, text, current_value, target_value, sort_order)')
        .eq('customer_id', activeCustomerId)
        .is('deleted_at', null)
        .order('sort_order')
    : { data: [] }

  const goalIds = (rawGoals ?? []).map(g => g.id)

  // Load parent-child links
  const { data: parentLinks } = goalIds.length
    ? await supabase
        .from('strategy_goal_parents')
        .select('child_id, parent_id')
        .in('child_id', goalIds)
    : { data: [] }

  // Build parent_ids map
  const parentMap: Record<string, string[]> = {}
  for (const link of parentLinks ?? []) {
    if (!parentMap[link.child_id]) parentMap[link.child_id] = []
    parentMap[link.child_id].push(link.parent_id)
  }

  const goals: StratGoal[] = (rawGoals ?? []).map(g => ({
    id: g.id,
    type: g.type as StratGoal['type'],
    title: g.title,
    description: g.description,
    owner: g.owner,
    engagement_id: g.engagement_id,
    sort_order: g.sort_order,
    key_results: ((g.key_results as any[]) ?? []).sort((a, b) => a.sort_order - b.sort_order),
    parent_ids: parentMap[g.id] ?? [],
  }))

  return (
    <div className="flex flex-col gap-4 h-full">
      <h1 className="text-2xl font-semibold tracking-tight shrink-0">Strategy Map</h1>
      <StratMapView
        customers={(customers ?? []) as StratCustomer[]}
        goals={goals}
        activeCustomerId={activeCustomerId}
      />
    </div>
  )
}
