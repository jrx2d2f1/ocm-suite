'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { updateTask } from '@/lib/actions/tasks'
import {
  type Task,
  STATUSES,
  CATEGORIES,
  CATEGORY_COLORS,
  STATUS_COLORS,
} from './types'

interface TaskPanelProps {
  task: Task | null
  onClose: () => void
  onUpdate: (updated: Task) => void
}

export function TaskPanel({ task, onClose, onUpdate }: TaskPanelProps) {
  const [form, setForm] = useState<Task | null>(task)
  const [isPending, startTransition] = useTransition()

  // Sync when task prop changes
  if (task?.id !== form?.id) {
    setForm(task)
  }

  function handleChange<K extends keyof Task>(key: K, value: Task[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function handleSave() {
    if (!form) return
    startTransition(async () => {
      await updateTask(form.id, {
        title: form.title,
        beschreibung: form.beschreibung ?? undefined,
        ziel: form.ziel ?? undefined,
        category: form.category,
        status: form.status,
        due: form.due ?? null,
        mitarbeitende: form.mitarbeitende ?? [],
      })
      onUpdate(form)
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/20 transition-opacity',
          task ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 z-40 flex h-screen w-96 flex-col border-l bg-background shadow-xl',
          'transition-transform duration-300',
          task ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {task && form && (
          <>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-semibold">Task bearbeiten</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 px-5 py-4">
              {/* Titel */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Titel
                </label>
                <textarea
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  rows={2}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {/* Status + Kategorie */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => handleChange('status', e.target.value as Task['status'])}
                    className="w-full rounded-md border bg-transparent px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Kategorie
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => handleChange('category', e.target.value as Task['category'])}
                    className="w-full rounded-md border bg-transparent px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fälligkeit */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Fälligkeit
                </label>
                <input
                  type="date"
                  value={form.due ?? ''}
                  onChange={(e) => handleChange('due', e.target.value || null)}
                  className="w-full rounded-md border bg-transparent px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {/* Beschreibung */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Beschreibung
                </label>
                <textarea
                  value={form.beschreibung ?? ''}
                  onChange={(e) => handleChange('beschreibung', e.target.value || null)}
                  rows={3}
                  placeholder="Was genau soll gemacht werden?"
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {/* Ziel */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Ziel
                </label>
                <textarea
                  value={form.ziel ?? ''}
                  onChange={(e) => handleChange('ziel', e.target.value || null)}
                  rows={2}
                  placeholder="Was soll mit dieser Maßnahme erreicht werden?"
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {/* Mitarbeitende */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Mitarbeitende
                </label>
                <input
                  type="text"
                  value={(form.mitarbeitende ?? []).join(', ')}
                  onChange={(e) =>
                    handleChange(
                      'mitarbeitende',
                      e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                  placeholder="Name 1, Name 2, …"
                  className="w-full rounded-md border bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {/* Status-Badge Vorschau */}
              <div className="pt-2 border-t">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                    CATEGORY_COLORS[form.category]
                  )}
                >
                  {form.category}
                </span>
                <span className={cn('ml-2 text-xs font-medium', STATUS_COLORS[form.status])}>
                  {form.status}
                </span>
              </div>
            </div>

            <div className="border-t px-5 py-3 flex gap-2">
              <Button onClick={handleSave} disabled={isPending} className="flex-1">
                {isPending ? 'Speichern…' : 'Speichern'}
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Abbrechen
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
