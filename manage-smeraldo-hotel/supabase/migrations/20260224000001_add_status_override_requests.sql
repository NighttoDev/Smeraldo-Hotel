-- Migration: Add status_override_requests table for manager approval workflow
-- Created: 2026-02-24
-- Purpose: Implement 2-step approval process for reception room status override requests

-- Create status_override_requests table
CREATE TABLE IF NOT EXISTS status_override_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_status room_status NOT NULL,
  reason TEXT NOT NULL CHECK (char_length(reason) >= 10),
  manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  manager_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_decision CHECK (
    (approved_at IS NULL AND rejected_at IS NULL) OR
    (approved_at IS NOT NULL AND rejected_at IS NULL) OR
    (approved_at IS NULL AND rejected_at IS NOT NULL)
  )
);

-- Add indexes for performance
CREATE INDEX idx_override_requests_pending
  ON status_override_requests(created_at DESC)
  WHERE approved_at IS NULL AND rejected_at IS NULL;

CREATE INDEX idx_override_requests_room
  ON status_override_requests(room_id, created_at DESC);

CREATE INDEX idx_override_requests_user
  ON status_override_requests(requested_by, created_at DESC);

-- Enable RLS
ALTER TABLE status_override_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Reception can view own requests, managers can view all
CREATE POLICY "Users can view own requests and managers view all"
  ON status_override_requests FOR SELECT
  USING (
    requested_by = auth.uid()
    OR (SELECT role FROM auth.users WHERE id = auth.uid()) = 'manager'
  );

-- RLS Policy: Reception and managers can create requests
CREATE POLICY "Reception and managers can create requests"
  ON status_override_requests FOR INSERT
  WITH CHECK (
    (SELECT role FROM auth.users WHERE id = auth.uid()) IN ('reception', 'manager')
    AND requested_by = auth.uid()
  );

-- RLS Policy: Only managers can update requests (approve/reject)
CREATE POLICY "Managers can update requests"
  ON status_override_requests FOR UPDATE
  USING ((SELECT role FROM auth.users WHERE id = auth.uid()) = 'manager')
  WITH CHECK ((SELECT role FROM auth.users WHERE id = auth.uid()) = 'manager');

-- Comment the table and columns
COMMENT ON TABLE status_override_requests IS 'Tracks room status override requests requiring manager approval';
COMMENT ON COLUMN status_override_requests.requested_status IS 'The room status that reception wants to override to';
COMMENT ON COLUMN status_override_requests.reason IS 'Explanation for why status override is needed (min 10 chars)';
COMMENT ON COLUMN status_override_requests.approved_at IS 'Timestamp when manager approved the request';
COMMENT ON COLUMN status_override_requests.rejected_at IS 'Timestamp when manager rejected the request';
COMMENT ON COLUMN status_override_requests.manager_comment IS 'Optional comment from manager on approval/rejection';
