'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function upsertCustomer(data: {
  id?: string
  org_id: string
  name: string
  parent_id?: string | null
  acct_type?: string | null
}): Promise<string> {
  const supabase = await createClient()
  if (data.id) {
    const { error } = await supabase
      .from('customers')
      .update({ name: data.name, parent_id: data.parent_id ?? null, acct_type: data.acct_type ?? null })
      .eq('id', data.id)
    if (error) throw new Error(error.message)
    revalidatePath('/dashboard')
    return data.id
  }
  const { data: inserted, error } = await supabase
    .from('customers')
    .insert({ org_id: data.org_id, name: data.name, parent_id: data.parent_id ?? null, acct_type: data.acct_type ?? null })
    .select('id').single()
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  return inserted.id
}

export async function deleteCustomer(id: string): Promise<void> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('engagements')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', id)
    .is('deleted_at', null)
  if ((count ?? 0) > 0) throw new Error('Kunde hat noch aktive Initiativen und kann nicht gelöscht werden.')
  const { error } = await supabase
    .from('customers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}
