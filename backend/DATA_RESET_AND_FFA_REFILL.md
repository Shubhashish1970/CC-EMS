# Database reset and FFA refill

**Single database:** The app and all backend scripts use only **Kweka_Call_Centre**. Local fallbacks and docs reference this database only (no `ems_call_centre` or `test`).

**Cluster databases:** In Atlas you may see `admin`, `local`, and `test`. Do **not** drop `admin` or `local` (MongoDB system databases). The unused `test` database can be dropped; from backend run `npm run drop:unused-databases` (uses `MONGODB_URI`; only drops `test`).

Use this flow when you want to **clear operational data** (activities, farmers, tasks, sampling runs, etc.) but **keep users and master data** (crops, products, languages, state-language mappings), then refill via FFA Sync so crop/product/activity data aligns with master.

## Important: use the same database as your app

The reset script uses `MONGODB_URI` from your environment. If you run it **locally** with a local `.env` (e.g. `mongodb://localhost:27017/...`), it clears that database only. The **deployed app** (e.g. Cloud Run) uses the MongoDB set in Cloud Run / GitHub Secrets – so the dashboard will still show old data.

To clear the database that the **deployed** app uses:

- Run the script **with the same `MONGODB_URI`** as production. From the **backend** directory:

```bash
# Replace with the exact URI your deployed backend uses (e.g. from Cloud Run env or GitHub Secrets)
MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/Kweka_Call_Centre?retryWrites=true&w=majority" npm run reset:dev-operational-data
```

Or set that URI in `backend/.env` and run:

```bash
cd backend
npm run reset:dev-operational-data
```

Then **reload the deployed app** – the dashboard should show 0 activities/tasks until you run FFA Sync again.

## 1. Clear operational data (keep users + crop/product master)

From the **backend** directory (and with the correct `MONGODB_URI` for the DB you want to clear):

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
