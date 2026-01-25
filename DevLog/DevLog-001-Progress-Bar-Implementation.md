# DevLog-001: Progress Bar Implementation and StrictMode Bug Fix

**Date**: 2026-01-25

## Problem

Loading indicator for URL-based splat files disappeared after a fixed 3-second timeout, regardless of actual loading progress. Large files (100+ MB) would still be downloading but users had no feedback.

## Solution

### 1. Implemented Progress Tracking

**Changes to `SplatViewer.tsx`**:
- Replaced direct `SplatMesh` instantiation with `SplatLoader` to access progress callbacks
- Added `onLoadProgress` and `onLoadComplete` props to communicate with parent component
- Removed fixed 3-second timeout
- Added visual progress bar with percentage display

**Changes to `App.tsx`**:
- Added `handleLoadProgress` callback to receive progress updates
- Added `handleLoadComplete` callback for completion
- Display file size information (e.g., "Loading: 40.9 MB / 163.8 MB")

### 2. Bug: Flashing Progress Numbers

**Symptom**: Progress text rapidly toggled between different values, progress bar stuck at 0%, file failed to load completely.

**Root Cause**: React StrictMode in development mode intentionally double-mounts components. This caused:
1. First mount: Creates scene, starts loader
2. StrictMode unmount
3. Second mount: Creates scene again, starts second loader
4. Two loaders running simultaneously, both updating state

**Initial Failed Fix**: Added `onLoadProgress` and `onLoadComplete` to useEffect dependency array. This caused infinite re-renders because these callbacks are recreated on every render.

**Correct Fix**: 
- Removed callbacks from dependency array (only `splatUrl` should trigger reload)
- Added `isMounted` flag to prevent state updates from unmounted component instances
- All loader callbacks check `isMounted` before updating state
- Cleanup function sets `isMounted = false`

## Code Changes

```typescript
// In loading useEffect
let isMounted = true;

loader.load(
  splatUrl,
  (packedSplats) => {
    if (!isMounted) return; // Guard against unmounted updates
    // ... rest of onLoad logic
  },
  (event) => {
    if (!isMounted) return; // Guard against unmounted updates
    // ... rest of onProgress logic
  },
  (err) => {
    if (!isMounted) return; // Guard against unmounted updates
    // ... rest of onError logic
  }
);

return () => {
  isMounted = false;
};
```

## Key Learnings

1. React StrictMode double-mounting is intentional for detecting side effects - always handle cleanup properly
2. Callback functions in useEffect dependencies cause re-renders if they're recreated on every render
3. Use cleanup flags (`isMounted`) to prevent state updates from stale async operations
4. SplatLoader provides `onProgress` callback with `ProgressEvent` containing `loaded` and `total` bytes

