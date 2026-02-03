# Detail Records Pages – Consistency Report

**Date:** 24 Jan 2026  
**Scope:** All pages that show detail records (tables/lists with pagination or load-more).

---

## 1. Design alignment (Request Callback vs Activity Monitoring)

- **Request Callback** is now aligned with **Activity Monitoring**:
  - **Page layout:** `space-y-6`; header and table in separate cards.
  - **Header card:** `rounded-3xl`, `border border-slate-200`, `shadow-sm`, same filter label style (`text-xs font-black text-slate-400 uppercase tracking-widest`).
  - **Table card:** `rounded-3xl`, same table header style (`text-xs font-black text-slate-500 uppercase tracking-widest`), sticky header.
  - **Pagination:** Moved out of the table card into a **separate card** below the table (`rounded-2xl p-4 border border-slate-200 shadow-sm`), matching Activity Monitoring and other list views.

---

## 2. Page Rows and lazy loading – by page

| Page | Component | Page Rows (Rows dropdown) | Lazy loading / pagination | Pagination card |
|------|-----------|----------------------------|----------------------------|-----------------|
| **Activity Monitoring** | `ActivitySamplingView.tsx` | Yes (10, 20, 50, 100), persisted `admin.activitySampling.pageSize` | Page-based (Previous/Next) | Separate card ✓ |
| **Request Callbacks** | `CallbackRequestView.tsx` | Yes (10, 20, 50, 100), persisted `teamLead.callbackRequest.pageSize` | Infinite scroll + “Load more” | Separate card ✓ |
| **Task Management (Admin)** | `TaskList.tsx` | Yes (10, 20, 50, 100), persisted `admin.taskManagement.pageSize` | Page-based (Previous/Next) | Separate card ✓ |
| **Agent History** | `AgentHistoryView.tsx` | Yes (10, 20, 50, 100), persisted `agent.history.pageSize` | Page-based (Previous/Next) | Separate card ✓ |
| **User Management** | `UserManagementView.tsx` | Yes (10, 20, 50, 100), persisted `admin.userManagement.pageSize` *(added)* | Page-based (Previous/Next) | Separate card ✓ |
| **Task Queue (Team Lead – Language / Agent detail)** | `TaskQueueTable.tsx` (used in `TaskDashboardView.tsx`) | Yes (via `pageSizeOptions`), parent persists `teamLead.queueTasks.pageSize` | Infinite scroll + “Load more” | Separate card ✓ *(updated)* |
| **Agent Queue (Admin – detail)** | `AgentQueueView.tsx` (uses `TaskQueueTable`) | Yes (`AGENT_QUEUE_PAGE_SIZE_OPTIONS`) | Infinite scroll + “Load more” | Separate card ✓ |

---

## 3. Changes made in this pass

1. **CallbackRequestView.tsx**
   - Pagination moved from inside the table card to a **separate card** below the table.
   - Same card style as Activity Monitoring: `bg-white rounded-2xl p-4 border border-slate-200 shadow-sm`.
   - Rows select uses `min-w-[80px]` for consistency.

2. **UserManagementView.tsx**
   - **Page Rows:** Added configurable page size (10, 20, 50, 100) with persistence (`admin.userManagement.pageSize`).
   - **Pagination card:** Replaced previous pagination block with the standard layout: “Page X of Y • N total users”, **Rows** dropdown, **Previous** / **Next** (using shared `Button`), in a separate `rounded-2xl` card.
   - Pagination card is shown whenever `pagination.total > 0` (not only when `pagination.pages > 1`).

3. **TaskQueueTable.tsx**
   - Table and pagination are split into two sibling elements: table stays in the existing `rounded-3xl` card; pagination is in a **separate card** below (`rounded-2xl p-4 border border-slate-200 shadow-sm mt-4`).
   - “Load more” and “All N tasks loaded” remain inside the table card; only the Rows bar is in the new card.
   - Ensures Language Queue detail, Agent Queue detail (Team Lead), and Agent Queue detail (Admin) all use the same pattern.

---

## 4. Shared patterns across detail-record pages

- **Table container:** `bg-white rounded-3xl border border-slate-200 shadow-sm` (or equivalent).
- **Table headers:** `text-xs font-black text-slate-500 uppercase tracking-widest`, `px-3 py-3`.
- **Pagination card:** `bg-white rounded-2xl p-4 border border-slate-200 shadow-sm`, separate from the table card.
- **Pagination content:** Left: “Page X of Y • N total …” or “Showing X of Y …”; right: **Rows** label + dropdown (10, 20, 50, 100 where applicable), and **Previous** / **Next** for page-based lists.
- **Page size:** Persisted in `localStorage` with a unique key per page.
- **Lazy loading:** Either page-based (Previous/Next) or infinite scroll with “Load more (X of Y shown)” and “All N … loaded” when done.

---

## 5. Sortable columns (aligned with Activity Monitoring)

All detail-record tables now follow the same sortable-column pattern as **Activity Monitoring**:

- **Clickable column headers** with “Click to sort” title.
- **ChevronUp / ChevronDown** to show current sort column and direction (asc/desc).
- **Sort state persisted** in `localStorage` where applicable (per-page key).
- **Stable sort** (original index as tiebreaker).

| Page | Component | Sortable columns | Persisted sort key |
|------|-----------|------------------|--------------------|
| **Activity Monitoring** | `ActivitySamplingView.tsx` | Type, Sampling, Date, Territory, BU, Officer, Total Farmers, Farmers Sampled, Tasks, In Queue, In Progress, Completed | `admin.activitySampling.tableSort` ✓ |
| **Request Callbacks** | `CallbackRequestView.tsx` | Farmer, Outcome, Outbound, Type, Agent, Date | `teamLead.callbackRequest.tableSort` ✓ *(added)* |
| **Task Management (Admin)** | `TaskList.tsx` | Farmer, Status, Scheduled, Agent, Territory, Activity, Officer, Language | `admin.taskManagement.tableSort` ✓ *(persist added)* |
| **Agent History** | `AgentHistoryView.tsx` | All data columns (Type, Territory, etc.) | `agent.history.tableSort` ✓ |
| **User Management** | `UserList.tsx` | User, Role, Languages, Team Lead, Status | `admin.userManagement.tableSort` ✓ *(added)* |
| **Task Queue (Team Lead)** | `TaskQueueTable.tsx` | Farmer, Status, Scheduled, Activity, Territory, Officer, Language, Assigned | `teamLead.queueTasks.tableSort` ✓ *(persist added)* |
| **Agent Queue (Admin)** | `TaskQueueTable.tsx` | Same as above | `admin.agentQueue.tableSort` ✓ *(persist added)* |

**Pattern (same as Activity Monitoring):** `tableSort` state `{ key, dir }`, `getSortValue(row, key)`, `sortedRows = useMemo(...)`, `handleHeaderClick(key)` toggles direction or sets new column, header `<th>` with `onClick`, `cursor-pointer`, `hover:bg-slate-100`, and ChevronUp/ChevronDown for the active column.

---

## 6. Master data views (Crops, Products, Languages, etc.)

Master management views (`CropsMasterView`, `ProductsMasterView`, `LanguagesMasterView`, `SentimentsMasterView`, `NonPurchaseReasonsMasterView`, `StateLanguageMappingView`) use tables for relatively small datasets. They do not currently have a Rows selector or pagination. If they grow large in the future, the same pattern (separate pagination card + Rows + page-based or load-more) can be applied.

---

## 7. Summary

- **Request Callback** design now matches **Activity Monitoring** (cards, table header style, **pagination in a separate card**, **sortable columns**).
- All main **detail-record pages** have:
  - **Page Rows** (configurable rows per page with a Rows dropdown where applicable).
  - **Lazy loading** (page-based or infinite scroll with “Load more”).
  - **Pagination in a separate card** with consistent styling.
  - **Sortable columns** (clickable headers, ChevronUp/ChevronDown, sort state persisted to localStorage where applicable).
- **User Management** has a Rows selector, same pagination card pattern, and sortable User/Role/Languages/Team Lead/Status columns.
- **TaskQueueTable** (Language Queue, Agent Queue details) uses a separate pagination card and optional `tableSortStorageKey` for persisting sort like Activity Monitoring.
