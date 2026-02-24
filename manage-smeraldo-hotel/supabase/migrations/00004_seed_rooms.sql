-- ============================================================================
-- Smeraldo Hotel — Seed Rooms
-- Migration: 00004_seed_rooms.sql
-- ============================================================================

INSERT INTO rooms (room_number, floor, room_type, status) VALUES
  -- BRD-aligned sellable rooms only (room 201 is intentionally excluded: "không bán")
  -- Floor 3
  ('301', 3, 'DELUXE TWIN', 'available'),
  ('302', 3, 'DELUXE DOUBLE', 'available'),
  ('303', 3, 'DELUXE TWIN', 'available'),
  ('304', 3, 'ONE BEDROOM APARTMENT 2 BEDS', 'available'),
  -- Floor 4
  ('401', 4, 'DELUXE TWIN', 'available'),
  ('402', 4, 'DELUXE DOUBLE', 'available'),
  ('403', 4, 'DELUXE TWIN', 'available'),
  ('404', 4, 'ONE BEDROOM APARTMENT 2 BEDS', 'available'),
  -- Floor 5
  ('501', 5, 'DELUXE TWIN', 'available'),
  ('502', 5, 'DELUXE DOUBLE', 'available'),
  ('503', 5, 'DELUXE TWIN', 'available'),
  ('504', 5, 'ONE BEDROOM APARTMENT 2 BEDS', 'available'),
  -- Floor 6
  ('601', 6, 'DELUXE TWIN', 'available'),
  ('602', 6, 'DELUXE DOUBLE', 'available'),
  ('603', 6, 'DELUXE TWIN', 'available'),
  ('604', 6, 'ONE BEDROOM APARTMENT 2 BEDS', 'available'),
  -- Floor 7
  ('701', 7, 'DELUXE TWIN', 'available'),
  ('702', 7, 'DELUXE DOUBLE', 'available'),
  ('703', 7, 'DELUXE TWIN', 'available'),
  ('704', 7, 'ONE BEDROOM APARTMENT 2 BEDS', 'available'),
  -- Floor 8
  ('801', 8, 'SUITE APARTMENT 2 BEDROOMS', 'available'),
  ('802', 8, 'ONE BEDROOM APARTMENT 2 BEDS', 'available'),
  -- Floor 9
  ('901', 9, 'SUITE APARTMENT 2 BEDROOMS', 'available'),
  ('902', 9, 'ONE BEDROOM APARTMENT 2 BEDS', 'available');
