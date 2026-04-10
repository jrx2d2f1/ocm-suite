import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CalendarView } from '@/components/kalender/calendar-view'

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; engagement?: string; customer?: string }>
}) {
  const { month: monthParam, engagement: engagementParam, customer: customerParam } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: membership } = await supabase
    .from('org_memberships')
    .select('org_id')
    .eq('user_id', user?.id ?? '')
    .is('deleted_at', null)
    .maybeSingle()

  if (!membership) redirect('/dashboard')

  const [{ data: customers }, { data: engagements }] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, parent_id')
      .eq('org_id', membership.org_id)
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('engagements')
      .select('id, name, eng_alias, customer_id')
      .eq('org_id', membership.org_id)
      .is('deleted_at', null)
      .order('name'),
  ])

  const activeCustomerId = customerParam && customerParam !== 'all' ? customerParam : 'all'
  const activeEngagementId = engagementParam && engagementParam !== 'all' ? engagementParam : 'all'

  const engsByCustomer = activeCustomerId !== 'all'
    ? (engagements ?? []).filter(e => e.customer_id === activeCustomerId).map(e => e.id)
    : (engagements ?? []).map(e => e.id)
  const allIds = engsByCustomer
  const targetIds = activeEngagementId !== 'all' ? [activeEngagementId] : allIds

  const { data: tasks } = targetIds.length
    ? await supabase
        .from('tasks')
        .select('id, title, status, category, due, engagement_id')
        .in('engagement_id', targetIds)
        .is('deleted_at', null)
        .not('due', 'is', null)
        .order('due')
    : { data: [] }

  // Parse month param (YYYY-MM), default to current month
  let year: number, month: number
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const parts = monthParam.split('-').map(Number)
    year = parts[0]
    month = parts[1] - 1 // 0-indexed
  } else {
    const now = new Date()
    year = now.getFullYear()
    month = now.getMonth()
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <h1 className="text-2xl font-semibold tracking-tight shrink-0">Kalender</h1>
      <CalendarView
        customers={(customers ?? []) as any}
        engagements={(engagements ?? []) as any}
        tasks={(tasks ?? []) as any}
        activeCustomerId={activeCustomerId}
        activeEngagementId={activeEngagementId}
        year={year}
        month={month}
      />
    </div>
  )
}
