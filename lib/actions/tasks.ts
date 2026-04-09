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
    beschreibung?: string | null
    ziel?: string | null
    category?: TaskCategory
    status?: TaskStatus
    due?: string | null
    owner_name?: string | null
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

export async function updateTaskStakeholders(
  taskId: string,
  stakeholderIds: string[]
) {
  const supabase = await createClient()

  // Replace all — delete then insert
  const { error: delError } = await supabase
    .from('task_stakeholders')
    .delete()
    .eq('task_id', taskId)

  if (delError) throw new Error(delError.message)

  if (stakeholderIds.length > 0) {
    const { error: insError } = await supabase
      .from('task_stakeholders')
      .insert(stakeholderIds.map((sid) => ({ task_id: taskId, stakeholder_id: sid })))

    if (insError) throw new Error(insError.message)
  }

  revalidatePath('/kanban')
}
