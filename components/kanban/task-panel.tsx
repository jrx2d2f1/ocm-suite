'use client'

import { useState, useTransition, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { updateTask, updateTaskStakeholders } from '@/lib/actions/tasks'
import {
  type Task,
  STATUSES,
  CATEGORIES,
  CATEGORY_COLORS,
  STATUS_COLORS,
} from './types'

interface AvailableStakeholder {
  id: string
  name: string
  stakeholder_type: string
}

interface TaskPanelProps {
  task: Task | null
  onClose: () => void
  onUpdate: (updated: Task) => void
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
      {children}
    </label>
  )
}

const inputCls =
  'w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm ' +
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 ' +
  'placeholder:text-muted-foreground/50 transition-colors hover:bg-white/8'

const textareaCls = inputCls + ' resize-none'

export function TaskPanel({ task, onClose, onUpdate }: TaskPanelProps) {
  const [form, setForm] = useState<Task | null>(task)
  const [isPending, startTransition] = useTransition()
  const [availableStakeholders, setAvailableStakeholders] = useState<AvailableStakeholder[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loadingStakeholders, setLoadingStakeholders] = useState(false)

  // Sync form when task prop changes
  if (task?.id !== form?.id) setForm(task)

  // Load stakeholders when task changes
  useEffect(() => {
    if (!task) {
      setAvailableStakeholders([])
      setSelectedIds(new Set())
      return
    }
    // Init selection from current task_stakeholders
    setSelectedIds(new Set((task.task_stakeholders ?? []).map(ts => ts.stakeholder_id)))

    // Fetch available stakeholders for this engagement
    setLoadingStakeholders(true)
    const supabase = createClient()
    supabase
      .from('stakeholders')
      .select('id, name, stakeholder_type')
      .eq('engagement_id', task.engagement_id)
      .is('deleted_at', null)
      .order('name')
      .then(({ data }) => {
        setAvailableStakeholders(data ?? [])
        setLoadingStakeholders(false)
      })
  }, [task?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange<K extends keyof Task>(key: K, value: Task[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function toggleStakeholder(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleSave() {
    if (!form) return
    startTransition(async () => {
      await Promise.all([
        updateTask(form.id, {
          title:         form.title,
          beschreibung:  form.beschreibung,
          ziel:          form.ziel,
          category:      form.category,
          status:        form.status,
          due:           form.due ?? null,
          owner_name:    form.owner_name,
          mitarbeitende: form.mitarbeitende ?? [],
        }),
        updateTaskStakeholders(form.id, Array.from(selectedIds)),
      ])
      // Optimistically update task_stakeholders in the returned object
      const updatedStakeholders = availableStakeholders
        .filter(s => selectedIds.has(s.id))
        .map(s => ({ stakeholder_id: s.id, role_in_task: null, stakeholders: s }))
      onUpdate({ ...form, task_stakeholders: updatedStakeholders })
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/30 backdrop-blur-[2px] transition-opacity',
          task ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 z-40 flex h-screen w-[400px] flex-col',
          'border-l border-white/10 bg-background/90 backdrop-blur-xl',
          'shadow-[-8px_0_32px_rgba(0,0,0,0.3)]',
          'transition-transform duration-300',
          task ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {task && form && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-white/[0.03] shrink-0">
              <div className="flex items-center gap-2">
                <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', CATEGORY_COLORS[form.category])}>
                  {form.category}
                </span>
                <span className={cn('text-xs font-medium', STATUS_COLORS[form.status])}>
                  {form.status}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white/10">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto space-y-4 px-5 py-5">

              {/* Titel */}
              <div className="space-y-1.5">
                <FieldLabel>Titel</FieldLabel>
                <textarea
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  rows={2}
                  className={textareaCls}
                />
              </div>

              {/* Status + Kategorie */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Status</FieldLabel>
                  <select
                    value={form.status}
                    onChange={(e) => handleChange('status', e.target.value as Task['status'])}
                    className={inputCls}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Kategorie</FieldLabel>
                  <select
                    value={form.category}
                    onChange={(e) => handleChange('category', e.target.value as Task['category'])}
                    className={inputCls}
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Verantwortliche:r + Fälligkeit */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Verantwortliche:r</FieldLabel>
                  <input
                    type="text"
                    value={form.owner_name ?? ''}
                    onChange={(e) => handleChange('owner_name', e.target.value || null)}
                    placeholder="Name"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Fälligkeit</FieldLabel>
                  <input
                    type="date"
                    value={form.due ?? ''}
                    onChange={(e) => handleChange('due', e.target.value || null)}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Beschreibung */}
              <div className="space-y-1.5">
                <FieldLabel>Beschreibung</FieldLabel>
                <textarea
                  value={form.beschreibung ?? ''}
                  onChange={(e) => handleChange('beschreibung', e.target.value || null)}
                  rows={3}
                  placeholder="Was genau soll gemacht werden?"
                  className={textareaCls}
                />
              </div>

              {/* Ziel */}
              <div className="space-y-1.5">
                <FieldLabel>Ziel</FieldLabel>
                <textarea
                  value={form.ziel ?? ''}
                  onChange={(e) => handleChange('ziel', e.target.value || null)}
                  rows={2}
                  placeholder="Was soll mit dieser Maßnahme erreicht werden?"
                  className={cn(textareaCls, 'border-l-2 border-l-primary/40')}
                />
              </div>

              {/* Mitarbeitende */}
              <div className="space-y-1.5">
                <FieldLabel>Mitarbeitende</FieldLabel>
                <input
                  type="text"
                  value={(form.mitarbeitende ?? []).join(', ')}
                  onChange={(e) =>
                    handleChange('mitarbeitende', e.target.value.split(',').map(s => s.trim()).filter(Boolean))
                  }
                  placeholder="Name 1, Name 2, …"
                  className={inputCls}
                />
              </div>

              {/* Beteiligte Stakeholder */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <FieldLabel>Beteiligte Stakeholder</FieldLabel>
                  {selectedIds.size > 0 && (
                    <span className="text-[10px] text-muted-foreground/60">{selectedIds.size} ausgewählt</span>
                  )}
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden">
                  {loadingStakeholders ? (
                    <p className="text-xs text-muted-foreground/50 italic px-3 py-3">Lade…</p>
                  ) : availableStakeholders.length === 0 ? (
                    <p className="text-xs text-muted-foreground/50 italic px-3 py-3">
                      Keine Stakeholder für diese Initiative.
                    </p>
                  ) : (
                    <div className="max-h-44 overflow-y-auto divide-y divide-white/5">
                      {availableStakeholders.map((s) => (
                        <label
                          key={s.id}
                          className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/6 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(s.id)}
                            onChange={() => toggleStakeholder(s.id)}
                            className="rounded accent-primary shrink-0"
                          />
                          <span className="text-sm flex-1 truncate">{s.name}</span>
                          <span className="text-[10px] text-muted-foreground/50 shrink-0">
                            {s.stakeholder_type === 'group' ? 'Gruppe' : 'Person'}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="border-t border-white/10 px-5 py-3 flex gap-2 bg-white/[0.02] shrink-0">
              <Button
                onClick={handleSave}
                disabled={isPending}
                className="flex-1 bg-primary/90 hover:bg-primary shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
              >
                {isPending ? 'Speichern…' : 'Speichern'}
              </Button>
              <Button variant="ghost" onClick={onClose} className="hover:bg-white/10">
                Abbrechen
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
