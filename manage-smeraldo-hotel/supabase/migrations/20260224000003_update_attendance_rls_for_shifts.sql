-- Migration: Update RLS policy to allow reception to end their own shifts
-- Created: 2026-02-24
-- Purpose: Allow reception to UPDATE attendance_logs when ending their own shift

-- Drop existing UPDATE policy (manager-only)
DROP POLICY IF EXISTS "Manager can update attendance logs" ON attendance_logs;

-- Create new UPDATE policy: manager OR self (for shift end)
CREATE POLICY "Manager or self can update attendance logs"
  ON attendance_logs FOR UPDATE
  USING (
    auth.jwt()->>'role' = 'manager'
    OR (
      -- Reception can update their own shift end
      auth.jwt()->>'role' = 'reception'
      AND staff_id = auth.uid()
      AND shift_started_at IS NOT NULL
      AND shift_ended_at IS NULL
    )
  );

COMMENT ON POLICY "Manager or self can update attendance logs" ON attendance_logs IS
  'Manager can update any attendance log. Reception can only update their own active shift (to end it).';
