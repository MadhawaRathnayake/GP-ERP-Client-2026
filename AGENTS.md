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
  No role has them until an admin ticks them; say so when you report done.
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
- Styling: Tailwind classes and shadcn components only. No custom CSS files, no inline `style`.
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
| `/products/new` | `pages/Products/CreateProductPage.tsx` (form; also exports `ProductForm`) |
| `/products/:id` | `pages/Products/ProductPage.tsx` (detail card, edit/delete) |
| `/products/:id/edit` | `pages/Products/EditProductPage.tsx` (edit form) |
| `/products/categories` | `pages/Categories/CategoriesPage.tsx` (DataGrid, create/edit dialog, delete/restore) |
| `/customers` | `pages/Customers/CustomersPage.tsx` (DataGrid, read-only) |
| `/customers/:id` | `pages/Customers/CustomerPage.tsx` (detail card) |
| `/reports` | `pages/Reports/ReportPage.tsx` (placeholder) |
| `/admin` | `pages/Admin/AdminPage.tsx` (users, roles, company settings, create dialogs) |
| `/admin/users/:id/edit` | `pages/Admin/EditUserPage.tsx` (edit user form) |
| `/admin/roles/:id/edit` | `pages/Admin/EditRolePage.tsx` (edit role + permissions) |
| any other URL | `NotFoundPage` from `components/StatusView.tsx` |

Backend: `GP-ERP-Server` (API docs at http://localhost:3000/docs). Set `VITE_API_URL=http://localhost:3000/api/v1` in `.env`.

## Not built yet

No tests, no role delete (the API has none), no user deactivate button (set Status to Inactive on the edit page). Permissions are defined in the backend code, not created from the UI.
