---
name: top-bar-actions
description: Use when a GP ERP page needs buttons, a search box, or other controls in the top bar (e.g. "add a Create button to the top bar", "add search to this page").
---

# Top bar buttons and search

Wrap controls in `<TopBarActions>` anywhere in the page's JSX. They render in the top bar while the page is open and disappear when it closes. Never edit `TopBar.tsx` or `TopBarActions.tsx` for a page-specific need.

```tsx
import { PlusIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { SearchInput } from "@/components/SearchInput"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"

<TopBarActions>
  <SearchInput placeholder="Search invoices…" />
  <Button asChild>
    <Link to="/invoices/new">
      <PlusIcon />
      New invoice
    </Link>
  </Button>
</TopBarActions>
```

- Order inside `<TopBarActions>` = left-to-right order in the top bar. The profile menu always stays at the far right.
- Controls can use the page's state and data directly (e.g. a dialog: see `CreateProfileDialog` in `src/pages/Admin/CreateUser.tsx`).

## Search

`<SearchInput />` stores the text in the URL as `?q=` (and sends every grid back to page 1).

- **Lists:** nothing else to do. `<DataGrid>` reads `?q=` and searches every row of the list, not just the current page (see `src/pages/Products/ProductsPage.tsx`).
- **Anything else:** read it with `useSearchParams().get("q")` and filter in the component, or pass it to a query hook for a server search.
