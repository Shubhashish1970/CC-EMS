# Frontend UI Standards

This document defines the standard components and styling for the EMS Call Centre frontend. All new and updated UI must follow these standards for consistency.

---

## Dropdowns (Single-Select)

**Standard component: `StyledSelect`** (from `components/shared/StyledSelect.tsx`).

- **Do not use** native HTML `<select>` elements. They render with the browser/OS default styling (e.g. dark dropdown panel on some systems) and break the application theme.
- **Always use** `StyledSelect` for any single-value dropdown: filters, pagination row size, form fields, etc.

### Usage

```tsx
import StyledSelect from '../shared/StyledSelect';  // adjust path as needed

<StyledSelect
  value={selectedValue}
  onChange={(v) => setSelectedValue(v)}
  options={[
    { value: '', label: 'All Items' },
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ]}
  placeholder="Select..."
  disabled={false}
  className=""
  error={false}
/>
```

### Styling (built into StyledSelect)

- Trigger: `min-h-12`, `px-4 py-3`, `rounded-xl`, `border` (1px), `border-slate-200`, focus/open: `border-lime-400`, `ring-2 ring-lime-400/20`
- Panel: white background, `border border-slate-200`, `rounded-xl`, options `text-sm font-medium`
- Selected option: lime checkmark, `bg-lime-50 text-lime-800`

### Other dropdown components

- **Multi-select with search:** `SearchableMultiSelect`
- **Unit picker (e.g. kg, gms, lt):** `UnitDropdown`
- **Tags / multi-tag with add:** `MultiTagSelect`
- **Date range preset:** custom button + panel (see ActivitySamplingView, AgentHistoryView); keep panel styling consistent (white bg, `border border-slate-200`, `rounded-xl`).

---

## Form inputs (text, number, date, textarea)

Use these classes for consistency with dropdowns:

- **Container:** `w-full` for full-width fields in a column layout.
- **Input:** `min-h-12`, `px-4 py-3`, `rounded-xl`, `border border-slate-200`, `text-sm font-medium text-slate-900`, placeholder `text-slate-400`.
- **Focus:** `focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-lime-400`.
- **Error state:** `border-red-300` / `focus:border-red-500` as appropriate.

---

## Summary

| Element           | Use this                    | Do not use   |
|------------------|-----------------------------|--------------|
| Single-select    | `StyledSelect`              | `<select>`   |
| Multi-select     | `SearchableMultiSelect`     | native multi |
| Unit (kg, etc.)  | `UnitDropdown`              | custom picker|
| Tags / add custom| `MultiTagSelect`            | —            |

When adding new screens or filters, import and use `StyledSelect` (or the other shared components above) so the app stays on-theme and consistent.
