# Phase 1: Build Cleanup Validation

**Priority:** P3 (Nice to have)
**Effort:** 0.5 hours
**Status:** Not Started
**Dependencies:** None

## Overview

Quick validation that build output is clean with no duplicated artifacts or deployment confusion. Scout found no issues, so this is verification only.

## Key Insights from Scout

- ✅ Single build output: `manage-smeraldo-hotel/build/`
- ✅ Clean package.json, no duplicate build scripts
- ✅ CI workflow builds correctly, deploys to VPS
- ✅ No ghost configs or stale build artifacts

## Requirements

### Validation Checklist

1. Verify single build directory exists
2. Check package.json scripts are standard
3. Confirm CI workflow builds in correct path
4. Ensure no `.env` files in build output
5. Verify PM2 ecosystem config is clean

## Implementation Steps

### Step 1: Local Build Verification (10min)

```bash
cd manage-smeraldo-hotel
npm run build
ls -la build/
# Should see: index.js, handler.js, prerendered/, client/
```

### Step 2: Check Package.json (5min)

Verify scripts section:
```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### Step 3: Review CI Workflow (10min)

Check `.github/workflows/deploy.yml`:
- Build command: `npm ci && npm run build`
- Build path: `manage-smeraldo-hotel/build`
- No duplicate build steps

### Step 4: VPS Deployment Check (5min)

SSH to VPS and verify:
```bash
ssh root@103.47.225.24
cd /var/www/manage-smeraldo-hotel/manage-smeraldo-hotel
ls -la build/
pm2 list  # Should show single app
```

## Success Criteria

- ✓ Single build directory confirmed
- ✓ No duplicate build configs
- ✓ CI workflow correct
- ✓ VPS deployment clean

## Notes

Scout found no issues, so this is a quick validation step. Can be skipped if confidence is high.
