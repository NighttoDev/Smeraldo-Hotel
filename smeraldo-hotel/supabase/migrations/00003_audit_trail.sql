-- ============================================================================
-- Smeraldo Hotel — Audit Trail: Room Status Logs
-- Migration: 00003_audit_trail.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table
-- ----------------------------------------------------------------------------

CREATE TABLE room_status_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         UUID NOT NULL REFERENCES rooms(id),
  previous_status room_status,
  new_status      room_status NOT NULL,
  changed_by      UUID NOT NULL REFERENCES staff_members(id),
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes           TEXT
);

-- ----------------------------------------------------------------------------
-- 2. Indexes
-- ----------------------------------------------------------------------------

CREATE INDEX idx_room_status_logs_room_id    ON room_status_logs(room_id);
CREATE INDEX idx_room_status_logs_changed_at ON room_status_logs(changed_at);

-- ----------------------------------------------------------------------------
-- 3. Row-Level Security
-- ----------------------------------------------------------------------------

ALTER TABLE room_status_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read room status logs"
  ON room_status_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert room status logs"
  ON room_status_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No UPDATE or DELETE policies — room_status_logs are immutable.

-- ----------------------------------------------------------------------------
-- 4. Trigger: log room status changes
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION log_room_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO room_status_logs (room_id, previous_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_room_status_change
  AFTER UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION log_room_status_change();
