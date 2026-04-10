'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function upsertGoal(data: {
  id?: string
  customer_id: string
  type: string
  title: string
  description?: string | null
  owner?: string | null
  engagement_id?: string | null
}): Promise<string> {
  const supabase = await createClient()

  if (data.id) {
    const { error } = await supabase
      .from('strategy_goals')
      .update({
        title: data.title,
        description: data.description ?? null,
        owner: data.owner ?? null,
        engagement_id: data.engagement_id ?? null,
      })
      .eq('id', data.id)

    if (error) throw new Error(error.message)
    revalidatePath('/strategy')
    return data.id
  }

  // Count existing goals of this type to determine sort_order
  const { count } = await supabase
    .from('strategy_goals')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', data.customer_id)
    .eq('type', data.type)
    .is('deleted_at', null)

  const { data: inserted, error } = await supabase
    .from('strategy_goals')
    .insert({
      customer_id: data.customer_id,
      type: data.type,
      title: data.title,
      description: data.description ?? null,
      owner: data.owner ?? null,
      engagement_id: data.engagement_id ?? null,
      sort_order: (count ?? 0) + 1,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/strategy')
  return inserted.id
}

export async function updateGoalParents(goalId: string, parentIds: string[]) {
  const supabase = await createClient()

  const { error: delError } = await supabase
    .from('strategy_goal_parents')
    .delete()
    .eq('child_id', goalId)

  if (delError) throw new Error(delError.message)

  if (parentIds.length > 0) {
    const { error } = await supabase
      .from('strategy_goal_parents')
      .insert(parentIds.map(pid => ({ child_id: goalId, parent_id: pid })))

    if (error) throw new Error(error.message)
  }

  revalidatePath('/strategy')
}

export async function upsertKeyResults(
  goalId: string,
  krs: Array<{ text: string; current_value: string; target_value: string }>
) {
  const supabase = await createClient()

  const { error: delError } = await supabase
    .from('key_results')
    .delete()
    .eq('goal_id', goalId)

  if (delError) throw new Error(delError.message)

  if (krs.length > 0) {
    const { error } = await supabase
      .from('key_results')
      .insert(
        krs.map((kr, i) => ({
          goal_id: goalId,
          text: kr.text,
          current_value: kr.current_value,
          target_value: kr.target_value,
          sort_order: i,
        }))
      )

    if (error) throw new Error(error.message)
  }

  revalidatePath('/strategy')
}

export async function deleteGoal(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('strategy_goals')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/strategy')
}
