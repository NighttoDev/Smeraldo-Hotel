-- Story 7.4: Push Notifications - Web Push Subscription Storage
-- Description: Creates push_subscriptions table to store Web Push API subscriptions for staff members
-- Dependencies: 00001_initial_schema.sql (requires staff_members table)

-- Push Subscriptions Table
-- Stores Web Push API subscription data per staff member per device
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,              -- Push service endpoint URL (unique per device/browser)
  p256dh_key TEXT NOT NULL,            -- Client public key for encryption (base64url)
  auth_key TEXT NOT NULL,              -- Client authentication secret (base64url)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(staff_id, endpoint)           -- One subscription per device per user
);

-- Indexes for query performance
CREATE INDEX idx_push_subscriptions_staff_id ON push_subscriptions(staff_id);

-- RLS Policies
-- Enable row level security
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- SELECT: Staff can view their own subscriptions
CREATE POLICY "Staff can view own subscriptions" ON push_subscriptions
  FOR SELECT USING (staff_id = auth.uid());

-- INSERT: Staff can create their own subscriptions
CREATE POLICY "Staff can create own subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (staff_id = auth.uid());

-- DELETE: Managers can delete any subscription (for admin purposes)
-- Staff can delete their own subscriptions (via updated_at = NULL pattern if needed)
CREATE POLICY "Manager can delete any subscription" ON push_subscriptions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- Staff can delete their own subscriptions
CREATE POLICY "Staff can delete own subscriptions" ON push_subscriptions
  FOR DELETE USING (staff_id = auth.uid());

-- Comments for documentation
COMMENT ON TABLE push_subscriptions IS 'Stores Web Push API subscription data for push notification delivery';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Push service endpoint URL (unique per device/browser)';
COMMENT ON COLUMN push_subscriptions.p256dh_key IS 'Client public key for message encryption (ECDH P-256)';
COMMENT ON COLUMN push_subscriptions.auth_key IS 'Client authentication secret for encrypting payloads';
