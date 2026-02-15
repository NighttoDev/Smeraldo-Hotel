-- ============================================================================
-- Smeraldo Hotel — Seed Rooms
-- Migration: 00004_seed_rooms.sql
-- ============================================================================

INSERT INTO rooms (room_number, floor, room_type, status) VALUES
  -- Floor 3: Standard
  ('301', 3, 'standard', 'available'),
  ('302', 3, 'standard', 'available'),
  ('303', 3, 'standard', 'available'),
  -- Floor 4: Standard
  ('401', 4, 'standard', 'available'),
  ('402', 4, 'standard', 'available'),
  ('403', 4, 'standard', 'available'),
  -- Floor 5: Standard
  ('501', 5, 'standard', 'available'),
  ('502', 5, 'standard', 'available'),
  ('503', 5, 'standard', 'available'),
  -- Floor 6: Standard
  ('601', 6, 'standard', 'available'),
  ('602', 6, 'standard', 'available'),
  ('603', 6, 'standard', 'available'),
  -- Floor 7: Standard
  ('701', 7, 'standard', 'available'),
  ('702', 7, 'standard', 'available'),
  ('703', 7, 'standard', 'available'),
  ('704', 7, 'standard', 'available'),
  -- Floor 8: Standard
  ('801', 8, 'standard', 'available'),
  ('802', 8, 'standard', 'available'),
  ('803', 8, 'standard', 'available'),
  ('804', 8, 'standard', 'available'),
  -- Floor 9: Apartment
  ('901', 9, 'apartment', 'available'),
  ('902', 9, 'apartment', 'available'),
  ('903', 9, 'apartment', 'available');
