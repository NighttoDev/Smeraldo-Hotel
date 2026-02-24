-- Migration: Add shift tracking columns to attendance_logs
-- Created: 2026-02-24
-- Purpose: Track reception shift start/end times for auto-logout and duration calculation

-- Add shift timestamp columns and notes
ALTER TABLE attendance_logs
  ADD COLUMN IF NOT EXISTS shift_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shift_ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Index for finding active shifts (optimized for shift_started_at IS NOT NULL AND shift_ended_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_attendance_active_shifts
  ON attendance_logs(staff_id, shift_started_at)
  WHERE shift_started_at IS NOT NULL AND shift_ended_at IS NULL;

-- Unique constraint to prevent concurrent active shifts
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_shift_per_staff
  ON attendance_logs(staff_id)
  WHERE shift_started_at IS NOT NULL AND shift_ended_at IS NULL;

-- Comments
COMMENT ON COLUMN attendance_logs.shift_started_at IS 'Timestamp when reception started their shift (for auto-logout after 12h)';
COMMENT ON COLUMN attendance_logs.shift_ended_at IS 'Timestamp when reception ended their shift';
COMMENT ON COLUMN attendance_logs.notes IS 'Optional notes for shift (e.g., early checkout reason, incidents)';
