-- ================================================================
-- Migration: Link milestones to canvas_phases
-- Run this in Supabase SQL Editor (Settings → SQL Editor)
-- ================================================================

-- 1. Add phase_id column (FK → canvas_phases, cascades on delete)
ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS phase_id uuid
  REFERENCES canvas_phases(id) ON DELETE CASCADE;

-- 2. Unique index: each phase maps to at most one milestone
CREATE UNIQUE INDEX IF NOT EXISTS idx_milestones_phase_id
  ON milestones(phase_id)
  WHERE phase_id IS NOT NULL;

-- After running this migration:
-- • Save any Initiative Canvas to auto-create milestones from its phases.
-- • Manually-created milestones (phase_id IS NULL) are unaffected.
