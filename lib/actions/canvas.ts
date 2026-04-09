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

  // 2. Phases
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
    if (p.id) {
      await supabase.from('canvas_phases').update(row).eq('id', p.id)
    } else {
      await supabase.from('canvas_phases').insert(row)
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
}
