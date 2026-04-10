-- Migration: Add target_date to strategy_goals
-- Run once in Supabase SQL Editor
ALTER TABLE strategy_goals ADD COLUMN IF NOT EXISTS target_date date;
