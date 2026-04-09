import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GanttChart } from '@/components/gantt/chart'
import { type GanttGroup, type GanttCustomer, type GanttEngagement } from '@/components/gantt/types'

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

  if (!membership) redirect('/dashboard')   // shouldn't happen after fix-permissions

  // ── Data ────────────────────────────────────────────────────────
  const [{ data: customers }, { data: engagements }] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, parent_id')
      .eq('org_id', membership.org_id)
      .is('deleted_at', null)
      .order('name'),

    supabase
      .from('engagements')
      .select('id, name, eng_alias, status, start_date, end_date, customer_id, milestones(id, name, due, status)')
      .eq('org_id', membership.org_id)
      .is('deleted_at', null)
      .order('created_at'),
  ])

  // ── Build group hierarchy ────────────────────────────────────────
  // customerMap: id → { ...customer, engagements[] }
  const customerMap = new Map<string, GanttCustomer>(
    (customers ?? []).map(c => [c.id, { ...c, engagements: [] }])
  )

  // Assign engagements (with nested milestones) to their customer
  for (const eng of engagements ?? []) {
    const c = customerMap.get(eng.customer_id)
    if (c) {
      c.engagements.push(eng as unknown as GanttEngagement)
    }
  }

  // Top-level groups = customers without a parent_id
  const groups: GanttGroup[] = []

  for (const customer of customers ?? []) {
    if (customer.parent_id) continue   // handled under parent

    const children = (customers ?? [])
      .filter(c => c.parent_id === customer.id)
      .map(c => customerMap.get(c.id)!)
      .filter(c => c.engagements.length > 0)

    if (children.length > 0) {
      // Group header with child customers
      const ownEngs = customerMap.get(customer.id)!.engagements
      const groupCustomers: GanttCustomer[] = [
        ...(ownEngs.length > 0 ? [customerMap.get(customer.id)!] : []),
        ...children,
      ]
      groups.push({ id: customer.id, name: customer.name, customers: groupCustomers })
    } else {
      // Standalone customer
      const c = customerMap.get(customer.id)!
      if (c.engagements.length > 0) {
        groups.push({ id: customer.id, name: customer.name, customers: [c] })
      }
    }
  }

  // ── Initial year: most recent year with data, ≤ current year ───
  const currentYear = new Date().getFullYear()
  const dataYears: number[] = []

  for (const eng of engagements ?? []) {
    if (eng.start_date) dataYears.push(parseInt(eng.start_date.split('-')[0]))
    if (eng.end_date)   dataYears.push(parseInt(eng.end_date.split('-')[0]))
    for (const ms of (eng as any).milestones ?? []) {
      if (ms.due) dataYears.push(new Date(ms.due).getFullYear())
    }
  }

  const relevantYears = dataYears.filter(y => y <= currentYear)
  const initialYear = relevantYears.length > 0
    ? Math.max(...relevantYears)
    : currentYear

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 h-full">
      <h1 className="text-2xl font-semibold tracking-tight shrink-0">Dashboard</h1>
      <GanttChart groups={groups} initialYear={initialYear} />
    </div>
  )
}
