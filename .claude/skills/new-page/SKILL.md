---
name: new-page
description: Use when adding a new page/screen/route to GP ERP (e.g. "add an Invoices page"). Covers the page file, route, sidebar link, tables, and forms.
---

# Add a new page

Only touch the files listed here. Infrastructure (layout, top bar, routing setup, the data grid) already exists.

Everything for a feature lives in one folder: `src/pages/<Feature>/` holds its pages, sub-pages (create, detail, edit), `api.ts` (calls + hooks) and `types.ts`.

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

In `src/router.tsx` (all routes live here), import the page and add one line inside `children`:

```tsx
{ path: "invoices", element: <InvoicesPage /> },
```

Detail pages use a param: `{ path: "invoices/:id", element: <InvoicePage /> }`, read with `const { id = "" } = useParams()`.

## 3. Sidebar link (only if it is a top-level section)

In `src/app/layout/navigation.ts`, add to `appPages` (icon from `lucide-react`):

```ts
{ id: "invoices", label: "Invoices", to: "/invoices", icon: ReceiptIcon, end: false },
```

This one line adds the sidebar link and the page-access checkbox for roles and accounts. Active highlighting is automatic.

## Content building blocks

- **List / table:** `DataGrid` — see the example below. Never write a table component per page.
- **Top bar buttons or search:** use the `top-bar-actions` skill.
- **Data from the API:** use the `add-feature-data` skill. Never call axios from a page.
- **Full-page form:** copy `src/pages/Products/CreateProductPage.tsx`.
- **Pop-up form:** copy `src/pages/Admin/CreateRole.tsx`.
- **Edit page:** copy `src/pages/Admin/EditRolePage.tsx`.

## Listing page with `DataGrid`

`DataGrid` takes the whole list and does search (`?q=` from `<SearchInput />`), header sorting, pagination with rows-per-page, loading / error / empty messages, row links and an Actions column. Page, page size and sort are kept in the URL. It handles thousands of rows.

```tsx
import { createColumnHelper } from "@tanstack/react-table"
import { PencilIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { DataGrid, type GridFeatures } from "@/components/DataGrid"
import { SearchInput } from "@/components/SearchInput"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"

import { useInvoices } from "./api"
import type { Invoice } from "./types"

const columnHelper = createColumnHelper<GridFeatures, Invoice>()

// Accessor columns are sortable and searchable. Use `cell` to format.
const columns = columnHelper.columns([
  columnHelper.accessor("number", { header: "Number" }),
  columnHelper.accessor("total", { header: "Total", cell: (info) => info.getValue().toFixed(2) }),
  columnHelper.accessor("createdAt", {
    header: "Created",
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
])

export function InvoicesPage() {
  const invoices = useInvoices()

  return (
    <div className="space-y-4">
      <TopBarActions>
        <SearchInput placeholder="Search invoices…" />
      </TopBarActions>
      <h1 className="text-2xl font-semibold">Invoices</h1>
      <DataGrid
        columns={columns}
        query={invoices}
        label="invoices"
        getRowId={(invoice) => invoice.id}
        rowHref={(invoice) => `/invoices/${invoice.id}`}
        rowActions={(invoice) => (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/invoices/${invoice.id}/edit`}>
              <PencilIcon />
              Edit
            </Link>
          </Button>
        )}
      />
    </div>
  )
}
```

- Define `columns` outside the component. If they need other data (e.g. a name lookup), build them in `useMemo` inside it (see `AdminPage.tsx`).
- To search a value that is not shown on its own, use an accessor function: `columnHelper.accessor((row) => `${row.name} ${row.email}`, { id: "name", … })`.
- Two grids on one page: give each a `urlKey` (`urlKey="accounts"`) so their URL params do not clash.

## Done when

`npm run build` and `npm run lint` pass, and the page opens at its URL.
