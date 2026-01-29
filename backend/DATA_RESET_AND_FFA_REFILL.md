# Database reset and FFA refill

Use this flow when you want to **clear operational data** (activities, farmers, tasks, sampling runs, etc.) but **keep users and master data** (crops, products, languages, state-language mappings), then refill via FFA Sync so crop/product/activity data aligns with master.

## 1. Clear operational data (keep users + crop/product master)

From the **backend** directory:

```bash
npm run reset:dev-operational-data
```

This deletes:

- `call_tasks`, `sampling_audits`, `cooling_periods`, `sampling_configs`
- `activities`, `farmers`, `sampling_runs`, `allocation_runs`, `inbound_queries`

It **preserves**:

- `users`, master data (crops, products, languages, non-purchase reasons, sentiments), state-language mappings

## 2. Ensure master data exists (optional)

If you haven’t already:

```bash
npm run seed:master-data   # if you have this script, or run seedMasterData.ts
```

Crop/product lists used by the mock FFA API and data-generation scripts are aligned with `seedMasterData` (Paddy, Cotton, Chilli, … and Nagarjuna Urea, Specialty Fungicide, …).

## 3. Start mock FFA API and run Full FFA Sync

- Start the **mock-ffa-api** (or point `FFA_API_URL` at your FFA API).
- Trigger a **full FFA Sync** from the app or via the backend (e.g. `triggerFFASync.ts` with full sync).

FFA Sync will create activities and farmers with **crops and products that match the master** (mock FFA uses the same lists as `seedMasterData`).

## 4. Run Sampling Control

After sync, use **Sampling Control** in the app (first sample run, then ad-hoc as needed).

---

## Data generation scripts (aligned with current codebase)

- **resetDevOperationalData.ts** – Clear operational data; preserve users + master.
- **createTestData.ts** – Creates test farmers/activities/tasks; uses **master crops/products** from DB (or fallback aligned with `seedMasterData`).
- **generateIndianData.ts** – Clears operational data, then generates Indian farmers/activities; uses **master crops/products** from DB (or fallback); activities include `firstSampleRun: false`.
- **generateIndianData.mongosh.js** – Same flow via mongosh; crops/products and `firstSampleRun` aligned with backend.
- **mock-ffa-api** – CROPS/PRODUCTS aligned with `seedMasterData` so FFA Sync gets valid crop/product activity data.

All of these produce or consume data that satisfies current criteria (activity schema, first-sample flag, crop/product master).
