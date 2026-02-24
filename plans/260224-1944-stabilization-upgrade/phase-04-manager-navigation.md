# Phase 4: Manager Navigation - Expand Access

**Priority:** P2 (Medium)
**Effort:** 1 hour
**Status:** Not Started
**Dependencies:** None

## Context Links

- Scout Report: `plans/reports/scout-260224-1944-stabilization-upgrade.md`
- Current Nav: `manage-smeraldo-hotel/src/lib/components/layout/TopNavbar.svelte`
- Mobile Nav: `manage-smeraldo-hotel/src/lib/components/layout/BottomTabBar.svelte`

## Overview

Add /rooms and /bookings to manager navbar. Currently managers can access these routes (route groups allow both reception + manager) but have no nav links.

## Key Insights from Scout

**Current Manager Links:**
- ✓ /dashboard
- ✓ /staff
- ✓ /reports
- ✗ /rooms (missing)
- ✗ /bookings (missing)

**Current Reception Links:**
- /rooms
- /bookings
- /attendance
- /inventory

**Route Access:** (reception) group allows both roles, so managers CAN access /rooms and /bookings via direct URL.

## Requirements

### Functional Requirements

1. Add /rooms to manager navbar
2. Add /bookings to manager navbar
3. Maintain existing manager links (dashboard, staff, reports)
4. Keep desktop and mobile nav consistent
5. Preserve reception nav unchanged

### Non-Functional Requirements

- UX: Intuitive nav order (logical grouping)
- Performance: No additional load time
- Consistency: Same icons/styling as reception

## Architecture

### Nav Structure (After Phase 4)

**Desktop (TopNavbar.svelte):**
```ts
manager: [
  { href: '/dashboard', label: 'Dashboard', icon: 'home' },
  { href: '/rooms', label: 'Phòng', icon: 'bed' },        // NEW
  { href: '/bookings', label: 'Đặt phòng', icon: 'calendar' }, // NEW
  { href: '/staff', label: 'Nhân viên', icon: 'users' },
  { href: '/attendance', label: 'Chấm công', icon: 'clock' },  // NEW
  { href: '/inventory', label: 'Kho', icon: 'package' },       // NEW
  { href: '/reports', label: 'Báo cáo', icon: 'chart' }
]
```

**Mobile (BottomTabBar.svelte):**
```ts
manager: [
  { href: '/dashboard', label: 'Trang chủ', icon: 'home' },
  { href: '/rooms', label: 'Phòng', icon: 'bed' },        // NEW
  { href: '/bookings', label: 'Đặt phòng', icon: 'calendar' }, // NEW
  { href: '/staff', label: 'Nhân viên', icon: 'users' },
  { href: '/reports', label: 'Báo cáo', icon: 'chart' }
]
```

Note: Mobile nav limited to 5 tabs for UX, so attendance + inventory go in overflow menu.

## Related Code Files

### Files to Modify

- `manage-smeraldo-hotel/src/lib/components/layout/TopNavbar.svelte`
- `manage-smeraldo-hotel/src/lib/components/layout/BottomTabBar.svelte`

## Implementation Steps

### Step 1: Update TopNavbar (20min)

1. Open `TopNavbar.svelte`
2. Find manager nav links array
3. Add /rooms and /bookings links:
   ```ts
   const managerLinks = [
     { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
     { href: '/rooms', label: 'Phòng', icon: BedIcon },
     { href: '/bookings', label: 'Đặt phòng', icon: CalendarIcon },
     { href: '/staff', label: 'Nhân viên', icon: UsersIcon },
     { href: '/attendance', label: 'Chấm công', icon: ClockIcon },
     { href: '/inventory', label: 'Kho', icon: PackageIcon },
     { href: '/reports', label: 'Báo cáo', icon: ChartIcon }
   ];
   ```
4. Import missing icons if needed
5. Test desktop nav rendering

### Step 2: Update BottomTabBar (20min)

1. Open `BottomTabBar.svelte`
2. Find manager nav links array
3. Add /rooms and /bookings:
   ```ts
   const managerTabs = [
     { href: '/dashboard', label: 'Trang chủ', icon: HomeIcon },
     { href: '/rooms', label: 'Phòng', icon: BedIcon },
     { href: '/bookings', label: 'Đặt phòng', icon: CalendarIcon },
     { href: '/staff', label: 'Nhân viên', icon: UsersIcon },
     { href: '/reports', label: 'Báo cáo', icon: ChartIcon }
   ];
   ```
4. Move attendance + inventory to overflow menu (hamburger)
5. Test mobile nav rendering

### Step 3: Test Navigation (20min)

1. Login as manager
2. Verify all links visible in desktop nav
3. Verify mobile nav shows 5 tabs
4. Click each link, verify route loads
5. Test active state highlighting
6. Test responsive behavior (desktop ↔ mobile)

## Todo List

- [ ] Update TopNavbar with new manager links
- [ ] Import missing icons
- [ ] Update BottomTabBar with new manager links
- [ ] Move attendance/inventory to overflow on mobile
- [ ] Test desktop nav as manager
- [ ] Test mobile nav as manager
- [ ] Verify active state works correctly
- [ ] Test responsive behavior
- [ ] Verify reception nav unchanged

## Success Criteria

- ✓ Manager sees /rooms in navbar
- ✓ Manager sees /bookings in navbar
- ✓ All existing manager links still present
- ✓ Desktop and mobile nav consistent
- ✓ Active route highlighted correctly
- ✓ Reception nav unchanged
- ✓ No visual regressions

## Risk Assessment

### Risks

1. **Nav overflow on small screens**
   - Mitigation: Use overflow menu for less-used links on mobile
   - Test: 320px width (iPhone SE)

2. **Icon confusion (too many links)**
   - Mitigation: Use distinct icons, clear labels
   - Test: User feedback on icon clarity

### Mitigation Strategies

- Test on multiple screen sizes (mobile, tablet, desktop)
- Use overflow menu for secondary links on mobile
- Maintain icon consistency with reception nav

## Security Considerations

- ✓ Route access already controlled by (reception) group RBAC
- ✓ Adding nav links doesn't change permissions
- ✓ No new security surface introduced

## Next Steps

1. Update both nav components
2. Test as manager role
3. Verify reception nav unchanged
4. Get user feedback on nav structure
5. Proceed to Phase 5 (Realtime Updates)
