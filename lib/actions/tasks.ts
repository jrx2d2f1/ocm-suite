'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type TaskStatus = 'Backlog' | 'In Progress' | 'Review' | 'Done'
type TaskCategory =
  | 'Kommunikation'
  | 'Enablement'
  | 'Sounding'
  | 'Sponsoring'
  | 'Reporting'
  | 'Erwartung'

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId)

  if (error) throw new Error(error.message)
  revalidatePath('/kanban')
}

export async function updateTask(
  taskId: string,
  data: {
    title?: string
    beschreibung?: string
    ziel?: string
    category?: TaskCategory
    status?: TaskStatus
    due?: string | null
    mitarbeitende?: string[]
  }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update(data)
    .eq('id', taskId)

  if (error) throw new Error(error.message)
  revalidatePath('/kanban')
}
