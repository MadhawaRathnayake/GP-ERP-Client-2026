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
    <Link to="/invoices/create">
      <PlusIcon />
      New invoice
    </Link>
  </Button>
</TopBarActions>
```

- Order inside `<TopBarActions>` = left-to-right order in the top bar. The profile menu always stays at the far right.
- Controls can use the page's state and data directly (e.g. a dialog: see `CreateProfileDialog` in `src/pages/Admin/CreateUser.tsx`).

## Detail pages (customer, supplier, product, quotation, invoice, delivery note, IR, PO, GRN, …)

The back button and the page's main actions always go in the top bar, not in the page body. On phones the buttons
show only their icon: wrap the label in `<span className="hidden sm:inline">…</span>` and give an icon-only link an
`aria-label`. Put the actions after the back button in `<div className="ml-auto flex items-center gap-2">`, so they sit
on the right. Full example: `src/pages/Customers/CustomerPage.tsx`.

The page's actions (approve, reject, cancel, edit, create the next document, …) go in `<TopBarActions>`, each with its
own `can(…)` and status condition, exactly as they would sit in the page. Put it where the action row would be, after
the loading/error early return, so the buttons appear only once the record has loaded. Confirmation dialogs
(`ConfirmButton`, `ReasonButton`) work there unchanged. See `src/pages/GoodsReceivedNotes/GoodsReceivedNotePage.tsx`.
The "Back to …" link goes first in that same `<TopBarActions>` block (so it's always leftmost), and alone in one while
the record is loading or failed to load. On create and edit pages, wrap the "Back to …" button in `<TopBarActions>`.
The PDF download button stays with its viewer.

## Search

`<SearchInput />` stores the text in the URL as `?q=` (and sends every grid back to page 1).

- **Lists:** nothing else to do. `<DataGrid>` reads `?q=` and searches every row of the list, not just the current page (see `src/pages/Products/ProductsPage.tsx`).
- **Anything else:** read it with `useSearchParams().get("q")` and filter in the component, or pass it to a query hook for a server search.
