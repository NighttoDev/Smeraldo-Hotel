-- ============================================================================
-- Smeraldo Hotel — Initial Database Schema
-- Migration: 00001_initial_schema.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Custom Enum Types
-- ----------------------------------------------------------------------------

CREATE TYPE staff_role AS ENUM ('manager', 'reception', 'housekeeping');

CREATE TYPE room_status AS ENUM ('available', 'occupied', 'checking_out_today', 'being_cleaned', 'ready');

CREATE TYPE booking_source AS ENUM ('agoda', 'booking_com', 'trip_com', 'facebook', 'walk_in');

CREATE TYPE movement_type AS ENUM ('stock_in', 'stock_out');

-- ----------------------------------------------------------------------------
-- 2. Tables
-- ----------------------------------------------------------------------------

-- Staff Members
CREATE TABLE staff_members (
  id         UUID PRIMARY KEY REFERENCES auth.users,
  full_name  TEXT NOT NULL,
  role       staff_role NOT NULL,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rooms
CREATE TABLE rooms (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number        TEXT UNIQUE NOT NULL,
  floor              INTEGER NOT NULL,
  room_type          TEXT NOT NULL,
  status             room_status DEFAULT 'available',
  current_guest_name TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- Guests
CREATE TABLE guests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  TEXT NOT NULL,
  phone      TEXT,
  email      TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bookings
CREATE TABLE bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         UUID NOT NULL REFERENCES rooms(id),
  guest_id        UUID NOT NULL REFERENCES guests(id),
  check_in_date   DATE NOT NULL,
  check_out_date  DATE NOT NULL,
  nights_count    INTEGER GENERATED ALWAYS AS (check_out_date - check_in_date) STORED,
  booking_source  booking_source,
  status          TEXT DEFAULT 'confirmed',
  created_by      UUID REFERENCES staff_members(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Attendance Logs
CREATE TABLE attendance_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    UUID NOT NULL REFERENCES staff_members(id),
  log_date    DATE NOT NULL,
  shift_value NUMERIC(2,1) NOT NULL CHECK (shift_value IN (0, 0.5, 1, 1.5)),
  logged_by   UUID NOT NULL REFERENCES staff_members(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),

  UNIQUE (staff_id, log_date)
);

-- Inventory Items
CREATE TABLE inventory_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT UNIQUE NOT NULL,
  category            TEXT NOT NULL,
  current_stock       INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  unit                TEXT NOT NULL DEFAULT 'units',
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Stock Movements (immutable log — no updated_at)
CREATE TABLE stock_movements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id        UUID NOT NULL REFERENCES inventory_items(id),
  movement_type  movement_type NOT NULL,
  quantity       INTEGER NOT NULL,
  recipient_name TEXT,
  logged_by      UUID NOT NULL REFERENCES staff_members(id),
  movement_date  DATE NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. Indexes
-- ----------------------------------------------------------------------------

CREATE INDEX idx_rooms_floor              ON rooms(floor);
CREATE INDEX idx_bookings_room_id         ON bookings(room_id);
CREATE INDEX idx_bookings_check_in_date   ON bookings(check_in_date);
CREATE INDEX idx_attendance_logs_staff_id ON attendance_logs(staff_id);
CREATE INDEX idx_attendance_logs_log_date ON attendance_logs(log_date);
CREATE INDEX idx_stock_movements_item_id  ON stock_movements(item_id);

-- ----------------------------------------------------------------------------
-- 4. Trigger: auto-update updated_at
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_staff_members_updated_at
  BEFORE UPDATE ON staff_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_guests_updated_at
  BEFORE UPDATE ON guests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_attendance_logs_updated_at
  BEFORE UPDATE ON attendance_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
