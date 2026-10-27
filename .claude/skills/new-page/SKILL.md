---
name: new-page
description: Use when adding a new page/screen/route to GP ERP (e.g. "add an Invoices page"). Covers the page file, route, sidebar link, tables, and forms.
---

# Add a new page

Only touch the files listed here. Infrastructure (layout, top bar, routing setup) already exists.

## 1. Create the page

`src/pages/<Feature>/<Name>Page.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function InvoicesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Invoices</h1>
      <Card>
        <CardHeader>
          <CardTitle>All invoices</CardTitle>
        </CardHeader>
        <CardContent>…</CardContent>
      </Card>
    </div>
  )
}
```

## 2. Add the route

In `src/app/router.tsx`, import the page and add one line inside `children`:

```tsx
{ path: "invoices", element: <InvoicesPage /> },
```

Detail pages use a param: `{ path: "invoices/:id", element: <InvoicePage /> }`, read with `const { id = "" } = useParams()`.

## 3. Sidebar link (only if it is a top-level section)

In `src/app/layout/Sidebar.tsx`, add to `links` (icon from `lucide-react`):

```tsx
{ to: "/invoices", label: "Invoices", icon: ReceiptIcon, end: false },
```

Active highlighting is automatic.

## Content building blocks

- **Table:** `DataTable` — see example below. Always handle loading / error / empty.
- **Top bar buttons or search:** use the `top-bar-actions` skill.
- **Data from the API:** use the `add-feature-data` skill. Never call axios from a page.
- **Full-page form:** copy `src/pages/CreatePage.tsx`.
- **Pop-up form:** copy a dialog from `src/pages/Admin/AdminPage.tsx`.

```tsx
import { DataTable, type Column } from "@/components/DataTable"

const columns: Column<Invoice>[] = [
  { header: "Number", cell: (row) => row.number },
  { header: "Total", cell: (row) => row.total.toFixed(2) },
]

{isPending ? (
  <p className="text-sm text-muted-foreground">Loading invoices…</p>
) : isError ? (
  <p className="text-sm text-destructive">Could not load invoices: {error.message}</p>
) : data.length === 0 ? (
  <p className="text-sm text-muted-foreground">No invoices yet.</p>
) : (
  <DataTable columns={columns} data={data} onRowClick={(row) => navigate(`/invoices/${row.id}`)} />
)}
```

## Done when

`npm run build` and `npm run lint` pass, and the page opens at its URL.
