-- 00002_rls_policies.sql
-- Row Level Security policies for Smeraldo Hotel

-- =============================================================================
-- Helper function to retrieve the current user's staff role
-- =============================================================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS staff_role AS $$
  SELECT role FROM staff_members WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================================
-- Enable RLS on all tables
-- =============================================================================
ALTER TABLE staff_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms            ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements  ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- ROOMS
-- =============================================================================
-- SELECT: all authenticated users
CREATE POLICY rooms_select_authenticated ON rooms
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- UPDATE: manager + reception (full access)
CREATE POLICY rooms_update_manager_reception ON rooms
  FOR UPDATE USING (get_user_role() IN ('manager', 'reception'))
  WITH CHECK (get_user_role() IN ('manager', 'reception'));

-- UPDATE: housekeeping can only set status to 'ready'
CREATE POLICY rooms_update_housekeeping_status ON rooms
  FOR UPDATE USING (get_user_role() = 'housekeeping')
  WITH CHECK (get_user_role() = 'housekeeping' AND status = 'ready');

-- =============================================================================
-- BOOKINGS
-- =============================================================================
-- SELECT: manager + reception only
CREATE POLICY bookings_select_manager_reception ON bookings
  FOR SELECT USING (get_user_role() IN ('manager', 'reception'));

-- INSERT: manager + reception only
CREATE POLICY bookings_insert_manager_reception ON bookings
  FOR INSERT WITH CHECK (get_user_role() IN ('manager', 'reception'));

-- UPDATE: manager + reception only
CREATE POLICY bookings_update_manager_reception ON bookings
  FOR UPDATE USING (get_user_role() IN ('manager', 'reception'))
  WITH CHECK (get_user_role() IN ('manager', 'reception'));

-- =============================================================================
-- GUESTS
-- =============================================================================
-- SELECT: manager + reception only
CREATE POLICY guests_select_manager_reception ON guests
  FOR SELECT USING (get_user_role() IN ('manager', 'reception'));

-- INSERT: manager + reception only
CREATE POLICY guests_insert_manager_reception ON guests
  FOR INSERT WITH CHECK (get_user_role() IN ('manager', 'reception'));

-- UPDATE: manager + reception only
CREATE POLICY guests_update_manager_reception ON guests
  FOR UPDATE USING (get_user_role() IN ('manager', 'reception'))
  WITH CHECK (get_user_role() IN ('manager', 'reception'));

-- =============================================================================
-- STAFF_MEMBERS
-- =============================================================================
-- SELECT: all authenticated users (for display)
CREATE POLICY staff_members_select_authenticated ON staff_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- INSERT: manager only
CREATE POLICY staff_members_insert_manager ON staff_members
  FOR INSERT WITH CHECK (get_user_role() = 'manager');

-- UPDATE: manager only
CREATE POLICY staff_members_update_manager ON staff_members
  FOR UPDATE USING (get_user_role() = 'manager')
  WITH CHECK (get_user_role() = 'manager');

-- DELETE: manager only
CREATE POLICY staff_members_delete_manager ON staff_members
  FOR DELETE USING (get_user_role() = 'manager');

-- =============================================================================
-- ATTENDANCE_LOGS
-- =============================================================================
-- SELECT: manager + reception
CREATE POLICY attendance_logs_select_manager_reception ON attendance_logs
  FOR SELECT USING (get_user_role() IN ('manager', 'reception'));

-- INSERT: manager + reception
CREATE POLICY attendance_logs_insert_manager_reception ON attendance_logs
  FOR INSERT WITH CHECK (get_user_role() IN ('manager', 'reception'));

-- UPDATE: manager only
CREATE POLICY attendance_logs_update_manager ON attendance_logs
  FOR UPDATE USING (get_user_role() = 'manager')
  WITH CHECK (get_user_role() = 'manager');

-- =============================================================================
-- INVENTORY_ITEMS
-- =============================================================================
-- SELECT: manager + reception
CREATE POLICY inventory_items_select_manager_reception ON inventory_items
  FOR SELECT USING (get_user_role() IN ('manager', 'reception'));

-- UPDATE: manager only (threshold changes)
CREATE POLICY inventory_items_update_manager ON inventory_items
  FOR UPDATE USING (get_user_role() = 'manager')
  WITH CHECK (get_user_role() = 'manager');

-- =============================================================================
-- STOCK_MOVEMENTS
-- =============================================================================
-- SELECT: manager + reception
CREATE POLICY stock_movements_select_manager_reception ON stock_movements
  FOR SELECT USING (get_user_role() IN ('manager', 'reception'));

-- INSERT: manager + reception
CREATE POLICY stock_movements_insert_manager_reception ON stock_movements
  FOR INSERT WITH CHECK (get_user_role() IN ('manager', 'reception'));
