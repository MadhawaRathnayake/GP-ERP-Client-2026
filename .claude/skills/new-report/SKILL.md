---
name: new-report
description: Use when adding or changing a report in GP ERP (e.g. "add a sales report"). Reports are pages under src/pages/Reports linked from the Reports page.
---

# Add a new report

A report is a normal page. Do not create report infrastructure.

## 1. Create the report

`src/pages/Reports/<Name>Report.tsx`:

```tsx
import { ArrowLeftIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function SalesReport() {
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/reports">
          <ArrowLeftIcon />
          Back to reports
        </Link>
      </Button>
      <h1 className="text-2xl font-semibold">Sales report</h1>
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>…</CardContent>
      </Card>
    </div>
  )
}
```

## 2. Add the route

In `src/app/router.tsx`:

```tsx
{ path: "reports/sales", element: <SalesReport /> },
```

The "Reports" sidebar link stays highlighted for every `/reports/...` URL. No sidebar change needed.

## 3. Link it from the Reports page

In `src/pages/Reports/ReportPage.tsx`, add a link (e.g. a Card containing `<Link to="/reports/sales">Sales report</Link>`).

## Report data

- Tabular output: `DataTable` (see the `new-page` skill).
- Data: add a fetch function + hook via the `add-feature-data` skill. Filtering/aggregating already-loaded data can be done in the report component (see the search filter in `src/pages/Admin/AdminPage.tsx`).
- Filters/search in the top bar: `top-bar-actions` skill.
- Charts: no chart library is installed. Ask the user before adding one.

## Done when

`npm run build` and `npm run lint` pass, and the report opens from the Reports page.
