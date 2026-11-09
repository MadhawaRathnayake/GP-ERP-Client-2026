# GP ERP — Agent & Developer Guide

Read this whole file before changing anything. It is the single source of truth for how this app is built.

## Rules for AI agents (mandatory)

1. **Small, focused changes only.** Change only the files the task needs. Do not refactor, rename, move, reformat, or "clean up" other code unless the user explicitly asks for it.
2. **Ask before broad changes.** If a task seems to need changes across many files, new infrastructure, a new dependency, or a change to anything in "Infrastructure" below, stop and explain the plan first. Implement only after the user approves.
3. **Do not build infrastructure.** Layout, routing, data fetching, top bar, tables, forms, toasts and search already exist. Reuse them. Do not add state libraries, new folders, wrappers, or abstractions.
4. **Keep it minimal.** Write the least code that solves the task. Match the style of the surrounding code.
5. **Verify before reporting done:** `npm run build` and `npm run lint` must pass. Say what you checked and what you did not.
6. **Git is read-only.** Allowed: commands that only read (`git status`, `git diff`, `git log`, `git show`, `git blame`, `git branch` without arguments). Prohibited: anything that changes the repository or its history (`commit`, `push`, `pull`, `fetch`, `merge`, `rebase`, `reset`, `checkout`/`switch`, `restore`, `stash`, `add`, `rm`, `tag`, `branch -d/-m`, `cherry-pick`, `revert`, `clean`, `remote`, `config`, `gh pr create`, …), even if a task seems to need it. Leave changes uncommitted; the user commits.

## Permissions for a new feature (mandatory)

- **Every new page or feature uses its own permission keys**, `<SCREEN>.VIEW / CREATE / EDIT / DELETE` (e.g.
  `CATEGORIES.*` for categories). Never reuse another feature's keys (not `PRODUCTS.*` for categories), even when the
  page sits under another section's URL. Otherwise an admin can't grant it separately in the role editor.
- The keys are defined by the backend (`../GP-ERP-Server/src/platform/security/permissions.ts`). If the keys the
  feature needs aren't there yet, **stop and tell the user** that the backend must add them first. Don't fall back to
  existing keys.
- When they exist, add them to `PermissionKey` in `src/app/auth.ts`. This is an expected edit, not an infrastructure
  change. Then use them everywhere: the route's `<RequirePermission>`, the sidebar link's `permission`, and `can(…)` on
  every create / edit / delete button.
- The role editor lists permissions from `GET /permissions`, so new keys appear there automatically, grouped by screen.
  Super Admin (the system role, `isSystem`) has them at once; other roles get them when an admin ticks them. Say so
  when you report done.
- Full walkthrough of a new feature across both repos (backend and frontend files, Suppliers example):
  `../GP-ERP-Server/ADDING-A-FEATURE.md`.

## Stack

Vite + React 19 + TypeScript (strict, no `any`) · Tailwind CSS v4 · shadcn/ui (Radix) · TanStack Query · React Router 6 · axios · react-hook-form + zod · sonner (toasts) · lucide-react (icons). Package manager: **npm**.

## Commands

```bash
npm install       # once
npm run dev       # dev server, http://localhost:5173
npm run build     # type-check + production build (must pass)
npm run lint      # eslint (must pass)
```

Copy `.env.example` to `.env` and set `VITE_API_URL` when a backend exists (defaults to `/api/v1`).

## Folder map

```
src/
├─ pages/            ← YOUR WORK GOES HERE. One folder per feature, holding everything for it:
│  └─ <Feature>/
│     ├─ <Name>Page.tsx    ← the page and its sub-pages (create, detail, edit), dialogs
│     ├─ api.ts            ← API calls + TanStack Query hooks
│     └─ types.ts          ← data types for the feature
├─ router.tsx        ← every route, in one place
├─ components/
│  ├─ DataGrid.tsx       ← the one table for every list: search, sorting, pagination, actions
│  ├─ TopBarActions.tsx  ← put page buttons/search in the top bar
│  ├─ SearchInput.tsx    ← search box bound to ?q= in the URL
│  └─ ui/                ← shadcn components (generated; do not edit by hand)
├─ app/              ← Infrastructure (layout, providers). Rarely touched.
│  ├─ auth.ts             ← signed-in user (`useMe`), `useCan(permission)`, login/logout, `PermissionKey`
│  ├─ settings.ts         ← company settings, `useFormat()` for money and dates
│  └─ layout/navigation.ts ← sidebar links, each with the permission it needs
└─ lib/
   ├─ http.ts        ← axios instance `http`, `ApiError`, `fetchAll` for paginated lists
   └─ utils.ts       ← `cn()` class-name helper
```

Import with the `@/` alias (`@/components/...`), never long relative paths.

## Infrastructure (already done — do not rebuild)

| Need | Use | File |
|---|---|---|
| Page layout (sidebar + top bar + content) | automatic for every route | `app/layout/AppLayout.tsx` |
| Add a URL | one line in the router | `router.tsx` |
| Add a sidebar link | one line in `appPages` (with its `<SCREEN>.VIEW` permission) | `app/layout/navigation.ts` |
| Show/hide by permission | `const can = useCan()` → `can("PRODUCTS.DELETE")` | `app/auth.ts` |
| Money and dates | `const format = useFormat()` → `format.money(n)`, `format.date(iso)` | `app/settings.ts` |
| Signed-in check | automatic: AppLayout sends signed-out users (any 401) to `/login?redirect=…` | `app/layout/AppLayout.tsx`, `app/providers.tsx` |
| Page needs a permission | wrap the route element in `<RequirePermission permission="…">` (shows "no access") | `app/RequirePermission.tsx` |
| 404 / no access / record not found | `NotFoundPage`, `NoAccessPage`, `<QueryError error={…} />` for a failed detail query | `components/StatusView.tsx` |
| Buttons/search in the top bar | `<TopBarActions>` | `components/TopBarActions.tsx` |
| Search box | `<SearchInput />` (reads/writes `?q=`) | `components/SearchInput.tsx` |
| Table / list | `<DataGrid columns query label rowHref? rowActions? />` | `components/DataGrid.tsx` |
| Load / save data | TanStack Query hooks | `pages/<Feature>/api.ts` |
| Live stock | automatic: read stock from `useProducts()` / `useProduct(id)`; it updates within a second of any change. A new product query must pass its response through `withLatestStock(List)` and use a `["products", "list", …]` or `["products", "detail", id]` key | `app/liveStock.ts`, `pages/Products/stock.ts` |
| Toast message | `toast.success("…")` / `toast.error("…")` from `sonner` | — |
| Profile menu (far right of top bar) | automatic | `app/layout/ProfileMenu.tsx` |

## How-to guides (skills)

Step-by-step recipes with copy-paste code live in `.claude/skills/`. Claude Code loads them automatically when relevant (or run `/new-page` etc.). Other agents: open the file before starting the task.

| Task | Guide |
|---|---|
| Add a page / route / sidebar link, tables, forms | `.claude/skills/new-page/SKILL.md` |
| Add or change a report | `.claude/skills/new-report/SKILL.md` |
| Buttons or search in the top bar | `.claude/skills/top-bar-actions/SKILL.md` |
| Load or save data (types.ts, api.ts with hooks) | `.claude/skills/add-feature-data/SKILL.md` |

Need a UI component not in `components/ui/`? Ask first, then `npx shadcn@latest add <name>` (answer **No** to "overwrite?").

## Conventions

- Named exports: `export function XPage()`. File name = component name.
- Styling: Tailwind classes and shadcn components only. No custom CSS files, no inline `style`. Only exception: the
  optional themes in `src/themes/` (one `@import` line in `index.css` picks one). They style only the background and the
  `data-ui="sidebar" | "topbar" | "login"` elements; never put page or component styles there.
- Colours: use theme tokens (`text-muted-foreground`, `bg-background`, `text-destructive`, …), not raw colours.
- Icons: `lucide-react`, named with the `Icon` suffix (`PlusIcon`).
- Strings: double quotes, no semicolons (matches existing code).
- Comments: only where the *why* is not obvious.
- TypeScript strict; no `any`, no `@ts-ignore`.

## Current pages

| URL | File |
|---|---|
| `/` | `pages/Dashboard/DashboardPage.tsx` (placeholder) |
| `/login` | `pages/Login/LoginPage.tsx` (sign in; outside the layout) |
| `/products` | `pages/Products/ProductsPage.tsx` (DataGrid over all products) |
| `/products/create` | `pages/Products/CreateProductPage.tsx` (form; also exports `ProductForm`) |
| `/products/:id` | `pages/Products/ProductPage.tsx` (detail card, edit/delete) |
| `/products/:id/edit` | `pages/Products/EditProductPage.tsx` (edit form) |
| `/products/categories` | `pages/Categories/CategoriesPage.tsx` (DataGrid, create/edit dialog, delete/restore) |
| `/customers` | `pages/Customers/CustomersPage.tsx` (DataGrid; search also finds city and district) |
| `/customers/create` | `pages/Customers/CreateCustomerPage.tsx` (form; also exports `CustomerForm`) |
| `/customers/:id` | `pages/Customers/CustomerPage.tsx` (detail, edit/delete/restore) |
| `/customers/:id/edit` | `pages/Customers/EditCustomerPage.tsx` (edit form) |
| `/suppliers` | `pages/Suppliers/SuppliersPage.tsx` (DataGrid) |
| `/suppliers/create` | `pages/Suppliers/CreateSupplierPage.tsx` (form; also exports `SupplierForm`) |
| `/suppliers/:id` | `pages/Suppliers/SupplierPage.tsx` (detail, edit/delete/restore) |
| `/suppliers/:id/edit` | `pages/Suppliers/EditSupplierPage.tsx` (edit form) |
| `/quotations` | `pages/Quotations/QuotationsPage.tsx` (DataGrid) |
| `/quotations/create` | `pages/Quotations/CreateQuotationPage.tsx` (form; also exports `QuotationForm`: customer, sales manager (the date is set to today, not asked), type (sales / service / warranty; service and warranty fields in their own card below), payment terms (default Cash on Delivery), delivery location, pre-order (sales only), product lines (sales and warranty; a service quotation has none, only a service charge in its card) with discounts (added from `ProductPickerDialog.tsx`: search, category filter, images), VAT preview, and at the end an "Expires" checkbox that shows "Valid until" (frontend only; unticked saves null)) |
| `/quotations/:id` | `pages/Quotations/QuotationPage.tsx` (detail, lines; confirm payment/credit, undo, cancel, reopen; edit/delete/restore while active; the printed quotation from `QuotationDocument.tsx` (react-pdf, same layout as the old system's PDF), lazy-loaded) |
| `/quotations/:id/edit` | `pages/Quotations/EditQuotationPage.tsx` (edit form; active quotations only). Line helpers and `referenceOptions` shared with the invoice form: `pages/Quotations/lines.ts` |
| `/invoices` | `pages/Invoices/InvoicesPage.tsx` (DataGrid; Create new only with `INVOICES.CREATE_DIRECT`) |
| `/invoices/create` | `pages/Invoices/CreateInvoicePage.tsx` (`?quotationId=` from a confirmed quotation's Create invoice button, needs `INVOICES.CREATE`; without it, `INVOICES.CREATE_DIRECT`. Also exports `InvoiceForm`: the quotation's header read-only, payment method/details, due date, notes, and the lines/service charge editable, with stock in hand and the quotation's price per line. Saves a draft) |
| `/invoices/:id` | `pages/Invoices/InvoicePage.tsx` (detail; invoice vs quotation price/cost/qty per line; finalize, cancel, edit draft; the tax invoice PDF from `InvoiceDocument.tsx` (react-pdf, the old system's layout, Times New Roman from `public/fonts/`), lazy-loaded) |
| `/invoices/:id/edit` | `pages/Invoices/EditInvoicePage.tsx` (edit form; drafts only) |
| `/delivery-notes` | `pages/DeliveryNotes/DeliveryNotesPage.tsx` (DataGrid; notes are made by "Finalize & create delivery note" on a sales or warranty invoice, so no Create button) |
| `/delivery-notes/:id` | `pages/DeliveryNotes/DeliveryNotePage.tsx` (detail and the invoice's products; on a draft: add/change the item verifier, then add the item issuer (a different user), which issues it. Both lists come from Admin → Dropdowns) |
| `/reports` | `pages/Reports/ReportPage.tsx` (placeholder) |
| `/admin` | `pages/Admin/AdminPage.tsx` (each card with its own VIEW: users (`USERS.VIEW`), roles with their managing role (`ROLES.VIEW`), company settings incl. VAT (`SETTINGS.VIEW`), dropdowns (`DropdownsCard`, `DROPDOWNS.VIEW`), which screens need approval (`ApprovalsCard`, `APPROVALS.VIEW`); create dialogs; Edit only on the users and roles the user manages) |
| `/admin/users/:id/edit` | `pages/Admin/EditUserPage.tsx` (edit user form; own account: name, email and password only) |
| `/admin/roles/:id/edit` | `pages/Admin/EditRolePage.tsx` (edit role, its managing role (Super Admin only) and permissions (only those the user may give); read-only for the system role and roles outside the user's branch) |
| any other URL | `NotFoundPage` from `components/StatusView.tsx` |

Backend: `GP-ERP-Server` (API docs at http://localhost:3000/docs). Set `VITE_API_URL=http://localhost:3000/api/v1` in `.env`.

## Porting from the old system

Old system: `C:UsersmadhaDocumentsDevelopment-22-10-2026` (`GP-System-Client`, `Gunda-Power-System-Backend`). Each ported
feature has a plan in `../GP-ERP-Server/docs/plans/` covering both repos; read it first. Next up: Supply (`supply.md`), a new
sidebar section (`section: "Supply"` in `navigation.ts`).

## Not built yet

**Repairs, Troubleshoots and Serial numbers modules don't exist yet.** Delivery notes exist up to issuing; "Delivered", dispatch date, delivery method and the PDF aren't built yet. Service and warranty
quotations and invoices already have fields for them (`repairReceiveNoteId`, `troubleshootId`, `oldInvoiceId` (an
old-system invoice number), `oldSerialNumberId`). Their selects (`referenceOptions` in `pages/Quotations/lines.ts`)
have no options yet, so they show "Not available yet" and save null; the server stores them as unchecked text with no
foreign key. Don't add fake data or tables for them. When a module is built, give its select its options there and see
`../GP-ERP-Server/AGENTS.md` → "Modules not built yet" for the server side. `productModel` (warranty) is a plain text
input by design. The tax invoice PDF has no serial-number section until the Serial numbers module exists.

No tests, no role delete (the API has none), no user deactivate button (set Status to Inactive on the edit page). Permissions are defined in the backend code, not created from the UI. Create pages are always `/<feature>/create`.

The system role (Super Admin, `Role.isSystem`, `useMe().data.isSuperAdmin`): one role, one user, at the top. The server gives it every permission, and nobody can change it or give it to a user. Every other role has a managing role (`parentRoleId`); an admin manages the roles below their own role and the users in them (`canManage` on each role and user from the API), can give only permissions their own role has, and never Settings, Dropdowns or Approvals (`superAdminOnly` from `GET /permissions`; only the Super Admin gives those). Everyone can change their own name, email and password, not their own role or status. The Admin link shows with any of `adminPermissions` (`app/layout/navigation.ts`); each card needs its own VIEW. The server's errors (`SYSTEM_ROLE`, `OUTSIDE_BRANCH`, `NOT_GRANTABLE`, `PARENT_CHANGE`, `OWN_ACCOUNT`, `SUPER_ADMIN_USER`) reach the user as toasts with its message.
