import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GanttChart } from '@/components/gantt/chart'
import { type GanttGroup, type GanttCustomer, type GanttEngagement } from '@/components/gantt/types'

// ── Stat card ──────────────────────────────────────────────────────
function StatCard({
  value,
  label,
  sub,
  warn,
}: {
  value: number
  label: string
  sub: string
  warn?: boolean
}) {
  return (
    <div className="rounded-xl border bg-card px-5 py-4 space-y-1">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-sm font-medium">{label}</p>
      <p className={warn ? 'text-xs text-amber-400' : 'text-xs text-emerald-400'}>{sub}</p>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // ── Auth + org ──────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()

  const { data: membership } = await supabase
    .from('org_memberships')
    .select('org_id')
    .eq('user_id', user?.id ?? '')
    .is('deleted_at', null)
    .maybeSingle()

  if (!membership) redirect('/dashboard')

  // ── Data: customers + engagements ────────────────────────────────
  const [{ data: customers }, { data: engagements }] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, parent_id')
      .eq('org_id', membership.org_id)
      .is('deleted_at', null)
      .order('name'),

    supabase
      .from('engagements')
      .select('id, name, eng_alias, status, start_date, end_date, customer_id')
      .eq('org_id', membership.org_id)
      .is('deleted_at', null)
      .order('created_at'),
  ])

  // ── Milestones (separate query to apply deleted_at filter) ───────
  const engagementIds = (engagements ?? []).map(e => e.id)

  const { data: rawMilestones } = engagementIds.length
    ? await supabase
        .from('milestones')
        .select('id, engagement_id, name, due, status')
        .in('engagement_id', engagementIds)
        .is('deleted_at', null)
        .order('due')
    : { data: [] }

  // Index milestones by engagement
  const milestonesByEng = new Map<string, typeof rawMilestones>()
  for (const ms of rawMilestones ?? []) {
    const list = milestonesByEng.get(ms.engagement_id) ?? []
    list.push(ms)
    milestonesByEng.set(ms.engagement_id, list)
  }

  // Merge milestones into engagements
  const allEngagements = (engagements ?? []).map(e => ({
    ...e,
    milestones: (milestonesByEng.get(e.id) ?? []) as { id: string; name: string; due: string | null; status: string }[],
  }))

  // ── Tasks count (open = not Done) ────────────────────────────────
  const [{ count: openTasksCount }, { count: reviewTasksCount }] = await Promise.all([
    engagementIds.length
      ? supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .in('engagement_id', engagementIds)
          .neq('status', 'Done')
      : Promise.resolve({ count: 0 }),
    engagementIds.length
      ? supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .in('engagement_id', engagementIds)
          .eq('status', 'Review')
      : Promise.resolve({ count: 0 }),
  ])

  // ── Stats ────────────────────────────────────────────────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const activeCustomerIds = new Set(
    allEngagements.filter(e => e.status === 'active').map(e => e.customer_id)
  )
  const activeEngCount = allEngagements.filter(e => e.status === 'active').length

  const allMilestones = rawMilestones ?? []
  const overdueMilestones = allMilestones.filter(
    (ms: any) => ms.due && new Date(ms.due) < today && ms.status !== 'done'
  )

  // ── Build group hierarchy ────────────────────────────────────────
  const customerMap = new Map<string, GanttCustomer>(
    (customers ?? []).map(c => [c.id, { ...c, engagements: [] }])
  )

  for (const eng of allEngagements) {
    const c = customerMap.get(eng.customer_id)
    if (c) c.engagements.push(eng as unknown as GanttEngagement)
  }

  const groups: GanttGroup[] = []

  for (const customer of customers ?? []) {
    if (customer.parent_id) continue

    const children = (customers ?? [])
      .filter(c => c.parent_id === customer.id)
      .map(c => customerMap.get(c.id)!)
      .filter(c => c.engagements.length > 0)

    if (children.length > 0) {
      const ownEngs = customerMap.get(customer.id)!.engagements
      const groupCustomers: GanttCustomer[] = [
        ...(ownEngs.length > 0 ? [customerMap.get(customer.id)!] : []),
        ...children,
      ]
      groups.push({ id: customer.id, name: customer.name, customers: groupCustomers })
    } else {
      const c = customerMap.get(customer.id)!
      if (c.engagements.length > 0) {
        groups.push({ id: customer.id, name: customer.name, customers: [c] })
      }
    }
  }

  // ── Initial year — default to currentYear so all this year's ─────
  // milestones are immediately visible; user can navigate for others
  const currentYear = new Date().getFullYear()
  const initialYear = currentYear

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 h-full">
      <h1 className="text-2xl font-semibold tracking-tight shrink-0">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        <StatCard
          value={activeCustomerIds.size}
          label="Aktive Kunden"
          sub={`${(customers ?? []).length} gesamt`}
        />
        <StatCard
          value={allEngagements.length}
          label="Engagements"
          sub={`${activeEngCount} aktiv`}
        />
        <StatCard
          value={allMilestones.length}
          label="Milestones"
          sub={overdueMilestones.length > 0 ? `${overdueMilestones.length} überfällig` : 'Alle im Plan'}
          warn={overdueMilestones.length > 0}
        />
        <StatCard
          value={openTasksCount ?? 0}
          label="Offene Tasks"
          sub={reviewTasksCount ? `${reviewTasksCount} in Review` : 'Keine in Review'}
          warn={(reviewTasksCount ?? 0) > 0}
        />
      </div>

      <GanttChart groups={groups} initialYear={initialYear} />
    </div>
  )
}
