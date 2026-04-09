import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MatrixView } from '@/components/stakeholder-matrix/matrix-view'

export default async function StakeholdersPage({
  searchParams,
}: {
  searchParams: Promise<{ engagement?: string }>
}) {
  const { engagement: engagementParam } = await searchParams
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
    .select('id, name, eng_alias, status')
    .eq('org_id', membership.org_id)
    .is('deleted_at', null)
    .order('name')

  const initialEngagementId = engagementParam ?? engagements?.[0]?.id ?? ''

  return (
    <div className="flex flex-col gap-4 h-full">
      <h1 className="text-2xl font-semibold tracking-tight shrink-0">Power / Interest-Matrix</h1>
      <MatrixView
        engagements={(engagements ?? []) as any}
        initialEngagementId={initialEngagementId}
      />
    </div>
  )
}
