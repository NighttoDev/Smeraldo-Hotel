-- ============================================================================
-- Smeraldo Hotel — Align Rooms Inventory with BRD (sellable rooms only)
-- Migration: 00008_align_rooms_with_brd.sql
-- Purpose:
--   - Remove legacy wrong room rows (803, 804, 903)
--   - Insert missing BRD rows (304, 404, 504, 604)
--   - Normalize room_type labels to BRD names
--   - Keep room 201 excluded (non-sellable per BRD)
-- NOTE:
--   This migration assumes no booking history references the legacy wrong room rows.
--   If production already has bookings on 803/804/903, migrate those records manually first.
-- ============================================================================

BEGIN;

-- 1) Delete legacy rows not present in BRD sellable inventory
DELETE FROM rooms
WHERE room_number IN ('803', '804', '903');

-- 2) Upsert BRD-aligned room inventory (23 sellable rooms)
INSERT INTO rooms (room_number, floor, room_type, status)
VALUES
  ('301', 3, 'DELUXE TWIN', 'available'),
  ('302', 3, 'DELUXE DOUBLE', 'available'),
  ('303', 3, 'DELUXE TWIN', 'available'),
  ('304', 3, 'ONE BEDROOM APARTMENT 2 BEDS', 'available'),
  ('401', 4, 'DELUXE TWIN', 'available'),
  ('402', 4, 'DELUXE DOUBLE', 'available'),
  ('403', 4, 'DELUXE TWIN', 'available'),
  ('404', 4, 'ONE BEDROOM APARTMENT 2 BEDS', 'available'),
  ('501', 5, 'DELUXE TWIN', 'available'),
  ('502', 5, 'DELUXE DOUBLE', 'available'),
  ('503', 5, 'DELUXE TWIN', 'available'),
  ('504', 5, 'ONE BEDROOM APARTMENT 2 BEDS', 'available'),
  ('601', 6, 'DELUXE TWIN', 'available'),
  ('602', 6, 'DELUXE DOUBLE', 'available'),
  ('603', 6, 'DELUXE TWIN', 'available'),
  ('604', 6, 'ONE BEDROOM APARTMENT 2 BEDS', 'available'),
  ('701', 7, 'DELUXE TWIN', 'available'),
  ('702', 7, 'DELUXE DOUBLE', 'available'),
  ('703', 7, 'DELUXE TWIN', 'available'),
  ('704', 7, 'ONE BEDROOM APARTMENT 2 BEDS', 'available'),
  ('801', 8, 'SUITE APARTMENT 2 BEDROOMS', 'available'),
  ('802', 8, 'ONE BEDROOM APARTMENT 2 BEDS', 'available'),
  ('901', 9, 'SUITE APARTMENT 2 BEDROOMS', 'available'),
  ('902', 9, 'ONE BEDROOM APARTMENT 2 BEDS', 'available')
ON CONFLICT (room_number) DO UPDATE
SET
  floor = EXCLUDED.floor,
  room_type = EXCLUDED.room_type,
  updated_at = now();

COMMIT;
