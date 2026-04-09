import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CanvasView } from '@/components/canvas/canvas-view'

export default async function CanvasPage({
  searchParams,
}: {
  searchParams: Promise<{ engagement?: string }>
}) {
  const { engagement: engagementId } = await searchParams
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

  // ── Data ────────────────────────────────────────────────────────
  const [{ data: customers }, { data: allEngagements }] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, parent_id')
      .eq('org_id', membership.org_id)
      .is('deleted_at', null)
      .order('name'),

    supabase
      .from('engagements')
      .select('id, name, eng_alias, status, customer_id')
      .eq('org_id', membership.org_id)
      .is('deleted_at', null)
      .order('created_at'),
  ])

  if (!allEngagements?.length) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Initiative Canvas</h1>
        <p className="text-sm text-muted-foreground">Keine Engagements vorhanden.</p>
      </div>
    )
  }

  // ── Active engagement ───────────────────────────────────────────
  const activeEngagement =
    allEngagements.find(e => e.id === engagementId) ?? allEngagements[0]
  const activeCustomerId = activeEngagement.customer_id

  // ── Canvas data ─────────────────────────────────────────────────
  const { data: canvas } = await supabase
    .from('canvas_data')
    .select('*, canvas_phases(*), canvas_kpis(*)')
    .eq('engagement_id', activeEngagement.id)
    .maybeSingle()

  return (
    <CanvasView
      key={activeEngagement.id}
      customers={customers ?? []}
      engagements={allEngagements}
      activeCustomerId={activeCustomerId}
      activeEngagementId={activeEngagement.id}
      canvas={canvas as any}
    />
  )
}
