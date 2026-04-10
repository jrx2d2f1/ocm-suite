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
      .select('id, name, parent_id, acct_type')
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
        .select('id, engagement_id, name, due, status, canvas_phases(color)')
        .in('engagement_id', engagementIds)
        .order('due')
    : { data: [] }

  // Index milestones by engagement, flattening the phase color
  const milestonesByEng = new Map<string, { id: string; name: string; due: string | null; status: string; color: string | null }[]>()
  for (const ms of rawMilestones ?? []) {
    const list = milestonesByEng.get(ms.engagement_id) ?? []
    list.push({
      id: ms.id,
      name: ms.name,
      due: ms.due,
      status: ms.status,
      color: (ms.canvas_phases as any)?.color ?? null,
    })
    milestonesByEng.set(ms.engagement_id, list)
  }

  // Merge milestones into engagements
  const allEngagements = (engagements ?? []).map(e => ({
    ...e,
    milestones: (milestonesByEng.get(e.id) ?? []) as { id: string; name: string; due: string | null; status: string; color: string | null }[],
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
    (customers ?? []).map(c => [c.id, { id: c.id, name: c.name, parent_id: c.parent_id ?? null, engagements: [] }])
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
      .map(c => customerMap.get(c.id))
      .filter((c): c is GanttCustomer => !!c)

    if (children.length > 0) {
      const ownC = customerMap.get(customer.id)!
      groups.push({ id: customer.id, name: customer.name, customers: [ownC, ...children] })
    } else {
      const c = customerMap.get(customer.id)!
      groups.push({ id: customer.id, name: customer.name, customers: [c] })
    }
  }

  // Flat list of all customers for the CustomerPanel selects
  const allCustomers = (customers ?? []).map(c => ({
    id: c.id,
    name: c.name,
    parent_id: c.parent_id ?? null,
    acct_type: (c as any).acct_type ?? null,
  }))

  // ── Initial year — prefer current year if it has milestones, ─────
  // otherwise use the year closest to today that has milestones
  const currentYear = new Date().getFullYear()
  const msYears = [...new Set(
    (rawMilestones ?? [])
      .filter(ms => ms.due)
      .map(ms => parseInt(ms.due!.slice(0, 4)))
  )]
  const initialYear = msYears.includes(currentYear)
    ? currentYear
    : msYears.length > 0
      ? msYears.reduce((best, y) =>
          Math.abs(y - currentYear) < Math.abs(best - currentYear) ? y : best
        )
      : currentYear

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

      <GanttChart
        groups={groups}
        initialYear={initialYear}
        orgId={membership.org_id}
        allCustomers={allCustomers}
      />
    </div>
  )
}
