---
name: top-bar-actions
description: Use when a GP ERP page needs buttons, a search box, or other controls in the top bar (e.g. "add a Create button to the top bar", "add search to this page").
---

# Top bar buttons and search

Wrap controls in `<TopBarActions>` anywhere in the page's JSX. They render in the top bar while the page is open and disappear when it closes. Never edit `TopBar.tsx` or `TopBarActions.tsx` for a page-specific need.

```tsx
import { PlusIcon } from "lucide-react"

import { SearchInput } from "@/components/SearchInput"
import { TopBarActions } from "@/components/TopBarActions"
import { TopBarButton } from "@/components/TopBarButton"

<TopBarActions>
  <SearchInput placeholder="Search invoices…" />
  <TopBarButton tone="main" to="/invoices/create" icon={PlusIcon} label="New invoice" />
</TopBarActions>
```

- Order inside `<TopBarActions>` = left-to-right order in the top bar. The profile menu always stays at the far right.
- Controls can use the page's state and data directly (e.g. a dialog: see `CreateProfileDialog` in `src/pages/Admin/CreateUser.tsx`).

## Detail pages (customer, supplier, product, quotation, invoice, delivery note, IR, PO, GRN, …)

The back button and the page's main actions always go in the top bar, not in the page body. On phones the buttons
show only their icon (`TopBarButton` and `BackButton` do it). Everything sits at the left end, in this order: back button, search, then the actions (create, edit,
delete/restore), then any other options (adjust stock, approve, …). No `ml-auto`: only the profile menu sits on the
right. Full example: `src/pages/Customers/CustomerPage.tsx`.

The page's actions (approve, reject, cancel, edit, create the next document, …) go in `<TopBarActions>`, each with its
own `can(…)` and status condition, exactly as they would sit in the page. Put it where the action row would be, after
the loading/error early return, so the buttons appear only once the record has loaded. Confirmation dialogs
(`ConfirmButton`, `ReasonButton`) work there unchanged. See `src/pages/GoodsReceivedNotes/GoodsReceivedNotePage.tsx`.
The "Back to …" link goes first in that same `<TopBarActions>` block (so it's always leftmost), and alone in one while
the record is loading or failed to load. On create and edit pages, wrap the "Back to …" button in `<TopBarActions>`.
The PDF download button stays with its viewer.

## Button styles (every page)

Every button in the top bar comes from `src/components/TopBarButton.tsx`; never a raw `<Button>` there:

```tsx
<BackButton to="/quotations" label="Quotations" />
<TopBarButton tone="main" to="/quotations/create" icon={PlusIcon} label="Create new" />
<TopBarButton to={`/quotations/${id}/edit`} icon={PencilIcon} label="Edit" />
<DialogTrigger asChild>
  <TopBarButton tone="danger" icon={Trash2Icon} label="Delete" />
</DialogTrigger>
```

- `tone="main"`: the page's one next step (Create, Approve, Confirm payment, Finalize, Create invoice): a green tint with a green border (`positive` variant).
- default (soft): every other action (Edit, Restore, Adjust stock, Undo, Reopen, …), a wash of the theme colour.
- `tone="danger"`: Delete, Cancel, Reject, a red wash. `ConfirmButton` / `ReasonButton` take `primary` / `destructive`
  and pass the icon as a component (`icon={CheckIcon}`).
- On phones only the icon shows; `label` stays as the accessible name. Pass `to` for a link, or `onClick`, `disabled`, `title`.
- Buttons in the page body (forms, tables, dialogs) keep using `<Button>`.

## Search

`<SearchInput />` stores the text in the URL as `?q=` (and sends every grid back to page 1).

- **Lists:** nothing else to do. `<DataGrid>` reads `?q=` and searches every row of the list, not just the current page (see `src/pages/Products/ProductsPage.tsx`).
- **Anything else:** read it with `useSearchParams().get("q")` and filter in the component, or pass it to a query hook for a server search.
