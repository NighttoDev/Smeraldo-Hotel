-- ============================================================================
-- Smeraldo Hotel — Offline Sync Receipts (Story 7.3)
-- Migration: 00007_offline_sync_receipts.sql
-- ============================================================================

CREATE TABLE offline_sync_receipts (
  queue_item_id UUID PRIMARY KEY,
  action TEXT NOT NULL,
  ok BOOLEAN NOT NULL,
  error TEXT,
  conflict BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_by UUID NOT NULL REFERENCES staff_members(id)
);

CREATE INDEX idx_offline_sync_receipts_processed_at ON offline_sync_receipts(processed_at);

ALTER TABLE offline_sync_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read offline sync receipts"
  ON offline_sync_receipts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert own offline sync receipts"
  ON offline_sync_receipts FOR INSERT
  TO authenticated
  WITH CHECK (processed_by = auth.uid());

CREATE POLICY "Authenticated users can update own offline sync receipts"
  ON offline_sync_receipts FOR UPDATE
  TO authenticated
  USING (processed_by = auth.uid())
  WITH CHECK (processed_by = auth.uid());
