'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type PhaseInput = {
  id?: string
  title: string
  start_date: string | null
  end_date: string | null
  dates_label: string | null
  color: string | null
  description: string | null
  goal: string | null
  sort_order: number
}

/** Convert 'YYYY-MM' to the last calendar day of that month as 'YYYY-MM-DD'. */
function lastDayOfMonth(yyyyMM: string | null): string | null {
  if (!yyyyMM || !/^\d{4}-\d{2}$/.test(yyyyMM)) return null
  const y = parseInt(yyyyMM.slice(0, 4))
  const m = parseInt(yyyyMM.slice(5, 7)) // 1-indexed
  // new Date(y, m, 0) gives the last day of month m (because day 0 = last day of previous month)
  const last = new Date(y, m, 0)
  return `${y}-${String(m).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
}

type KpiInput = {
  id?: string
  kr_id?: string | null
  name: string
  sub: string | null
  baseline: string | null
  target_value: string | null
  current_value: string | null
  methode: string | null
  ampel: string
  sort_order: number
}

export async function saveCanvas(args: {
  canvasId: string
  fields: {
    ausgangslage: string
    strategischer_kontext: string
    treiber: string
    risiken_bei_nicht_handeln: string
    ziele_org: string[]
    ziele_funktional: string[]
    ziele_people: string[]
    ziele_tech: string[]
    erfolg_narrativ: string
  }
  phases: PhaseInput[]
  deletedPhaseIds: string[]
  kpis: KpiInput[]
  deletedKpiIds: string[]
}) {
  const supabase = await createClient()
  const { canvasId, fields, phases, deletedPhaseIds, kpis, deletedKpiIds } = args

  // 1. Update canvas_data
  const { error } = await supabase
    .from('canvas_data')
    .update(fields)
    .eq('id', canvasId)
  if (error) throw new Error(error.message)

  // Fetch engagement_id so we can sync milestones
  const { data: canvasRow } = await supabase
    .from('canvas_data')
    .select('engagement_id')
    .eq('id', canvasId)
    .single()
  const engagementId = canvasRow?.engagement_id ?? null

  // 2. Phases — deleted phases cascade-delete their linked milestones via FK
  if (deletedPhaseIds.length > 0) {
    await supabase.from('canvas_phases').delete().in('id', deletedPhaseIds)
  }
  for (const p of phases) {
    const row = {
      canvas_id: canvasId,
      title: p.title,
      start_date: p.start_date,
      end_date: p.end_date,
      dates_label: p.dates_label,
      color: p.color,
      description: p.description,
      goal: p.goal,
      sort_order: p.sort_order,
    }
    let phaseId: string
    if (p.id) {
      await supabase.from('canvas_phases').update(row).eq('id', p.id)
      phaseId = p.id
    } else {
      const { data: inserted } = await supabase
        .from('canvas_phases')
        .insert(row)
        .select('id')
        .single()
      phaseId = inserted!.id
    }

    // Sync milestone: name = phase title, due = last day of end_date month
    if (engagementId) {
      const dueDate = lastDayOfMonth(p.end_date)
      const { data: existingMs } = await supabase
        .from('milestones')
        .select('id')
        .eq('phase_id', phaseId)
        .maybeSingle()

      if (existingMs) {
        // Preserve status — only update name, due, sort_order
        await supabase
          .from('milestones')
          .update({ name: p.title, due: dueDate, sort_order: p.sort_order })
          .eq('phase_id', phaseId)
      } else {
        await supabase.from('milestones').insert({
          phase_id: phaseId,
          engagement_id: engagementId,
          name: p.title,
          due: dueDate,
          status: 'planned',
          sort_order: p.sort_order,
        })
      }
    }
  }

  // 3. KPIs
  if (deletedKpiIds.length > 0) {
    await supabase.from('canvas_kpis').delete().in('id', deletedKpiIds)
  }
  for (const k of kpis) {
    const row = {
      canvas_id: canvasId,
      kr_id: k.kr_id ?? null,
      name: k.name,
      sub: k.sub,
      baseline: k.baseline,
      target_value: k.target_value,
      current_value: k.current_value,
      methode: k.methode,
      ampel: k.ampel,
      sort_order: k.sort_order,
    }
    if (k.id) {
      await supabase.from('canvas_kpis').update(row).eq('id', k.id)
    } else {
      await supabase.from('canvas_kpis').insert(row)
    }
  }

  revalidatePath('/canvas')
  revalidatePath('/dashboard')
}
