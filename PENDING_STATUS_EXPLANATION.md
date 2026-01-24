# Understanding "Pending" Outcome in Agent History

## Current Situation

You're seeing **"Outcome: pending"** in the Agent History table, but all statistics boxes show **0** (except TOTAL which shows 32).

## Root Cause

The database has **26 tasks with status `'pending'`**, but:

1. **`'pending'` is NOT a valid TaskStatus** according to the data model
2. **Valid statuses are:**
   - `unassigned`
   - `sampled_in_queue` → Maps to **"IN QUEUE"** box
   - `in_progress` → Maps to **"IN PROGRESS"** box
   - `completed` → Maps to **"COMPLETED"** box
   - `not_reachable` → Maps to **"UNSUCCESSFUL"** box
   - `invalid_number` → Maps to **"INVALID"** box

3. **The statistics endpoint only counts valid statuses:**
   - It excludes `sampled_in_queue` (counted separately as "IN QUEUE")
   - It counts: `in_progress`, `completed`, `not_reachable`, `invalid_number`
   - **It does NOT count `'pending'`** because it's not a valid status

## Why "Pending" Appears in Table but Not in Statistics

- **History endpoint** shows all tasks (including invalid statuses like 'pending')
- **Statistics endpoint** only counts valid statuses
- Result: 26 "pending" tasks appear in the table but aren't counted in any statistics box

## What "Pending" Should Map To

Based on the workflow, `'pending'` likely means:
- Tasks that are **assigned to an agent** but **not yet started**
- These should probably be:
  - **Converted to `sampled_in_queue`** (if waiting in queue), OR
  - **Converted to `in_progress`** (if agent has started but not selected outbound status yet)

## Solution Options

### Option 1: Fix the Data (Recommended)
Update all `'pending'` status tasks to a valid status:
- If they're assigned but not started → `sampled_in_queue`
- If they're in progress → `in_progress`

### Option 2: Add "Pending" to Statistics
Modify the code to:
- Add `'pending'` as a valid TaskStatus
- Count it in a new statistics box (e.g., "Pending")
- Or map it to an existing box (e.g., "IN QUEUE")

### Option 3: Filter Out "Pending" from History
Update the history endpoint to exclude `'pending'` status tasks (treat them as invalid)

## Current Status Distribution

From the database:
- `unassigned`: 76 tasks
- `pending`: 26 tasks ⚠️ **Invalid status - not counted**
- `sampled_in_queue`: 17 tasks → **IN QUEUE** box
- `completed`: 5 tasks → **COMPLETED** box
- `in_progress`: 4 tasks → **IN PROGRESS** box
- `invalid_number`: 1 task → **INVALID** box
- `not_reachable`: 1 task → **UNSUCCESSFUL** box

**Total: 130 tasks**
**Valid statuses (excluding unassigned and pending): 28 tasks**
**This explains why statistics show 0 for most boxes - the 26 "pending" tasks aren't being counted!**
