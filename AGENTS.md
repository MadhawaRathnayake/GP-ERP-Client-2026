# GP ERP — Agent & Developer Guide

Read this whole file before changing anything. It is the single source of truth for how this app is built.

## Rules for AI agents (mandatory)

1. **Small, focused changes only.** Change only the files the task needs. Do not refactor, rename, move, reformat, or "clean up" other code unless the user explicitly asks for it.
2. **Ask before broad changes.** If a task seems to need changes across many files, new infrastructure, a new dependency, or a change to anything in "Infrastructure" below, stop and explain the plan first. Implement only after the user approves.
3. **Do not build infrastructure.** Layout, routing, data fetching, top bar, tables, forms, toasts and search already exist. Reuse them. Do not add state libraries, new folders, wrappers, or abstractions.
4. **Keep it minimal.** Write the least code that solves the task. Match the style of the surrounding code.
5. **Verify before reporting done:** `npm run build` and `npm run lint` must pass. Say what you checked and what you did not.
6. **Git is read-only.** Allowed: commands that only read (`git status`, `git diff`, `git log`, `git show`, `git blame`, `git branch` without arguments). Prohibited: anything that changes the repository or its history (`commit`, `push`, `pull`, `fetch`, `merge`, `rebase`, `reset`, `checkout`/`switch`, `restore`, `stash`, `add`, `rm`, `tag`, `branch -d/-m`, `cherry-pick`, `revert`, `clean`, `remote`, `config`, `gh pr create`, …), even if a task seems to need it. Leave changes uncommitted; the user commits.

## Stack

Vite + React 19 + TypeScript (strict, no `any`) · Tailwind CSS v4 · shadcn/ui (Radix) · TanStack Query · React Router 6 · axios · react-hook-form + zod · sonner (toasts) · lucide-react (icons). Package manager: **npm**.

## Commands

```bash
npm install       # once
npm run dev       # dev server, http://localhost:5173
npm run build     # type-check + production build (must pass)
npm run lint      # eslint (must pass)
```

Copy `.env.example` to `.env` and set `VITE_API_URL` when a backend exists (defaults to `/api`).

## Folder map

```
src/
├─ pages/            ← YOUR WORK GOES HERE. One folder per feature, holding everything for it:
│  └─ <Feature>/
│     ├─ <Name>Page.tsx    ← the page and its sub-pages (create, detail, edit), dialogs
│     ├─ api.ts            ← API calls + TanStack Query hooks (+ mock data while there is no backend)
│     └─ types.ts          ← data types for the feature
├─ router.tsx        ← every route, in one place
├─ components/
│  ├─ DataGrid.tsx       ← the one table for every list: search, sorting, pagination, actions
│  ├─ TopBarActions.tsx  ← put page buttons/search in the top bar
│  ├─ SearchInput.tsx    ← search box bound to ?q= in the URL
│  └─ ui/                ← shadcn components (generated; do not edit by hand)
├─ app/              ← Infrastructure (layout, providers). Rarely touched.
│  └─ layout/navigation.ts ← list of top-level pages (sidebar links + page access)
└─ lib/
   ├─ http.ts        ← axios instance `http`, `USE_MOCK` switch, `mockDelay`
   └─ utils.ts       ← `cn()` class-name helper
```

Import with the `@/` alias (`@/components/...`), never long relative paths.

## Infrastructure (already done — do not rebuild)

| Need | Use | File |
|---|---|---|
| Page layout (sidebar + top bar + content) | automatic for every route | `app/layout/AppLayout.tsx` |
| Add a URL | one line in the router | `router.tsx` |
| Add a sidebar link (+ page access) | one line in `appPages` | `app/layout/navigation.ts` |
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
| Load or save data (types.ts, api.ts with mock + hooks) | `.claude/skills/add-feature-data/SKILL.md` |

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
| `/products` | `pages/Products/ProductsPage.tsx` (DataGrid over all products, real API) |
| `/products/new` | `pages/Products/CreateProductPage.tsx` (form, mock) |
| `/products/:id` | `pages/Products/ProductPage.tsx` (detail card) |
| `/reports` | `pages/Reports/ReportPage.tsx` (placeholder) |
| `/profile` | `pages/Profile/ProfilePage.tsx` (placeholder form) |
| `/admin` | `pages/Admin/AdminPage.tsx` (accounts, roles, search, create dialogs) |
| `/admin/accounts/:id/edit` | `pages/Admin/EditUserPage.tsx` (edit account form) |
| `/admin/roles/:id/edit` | `pages/Admin/EditRolePage.tsx` (edit role + page access) |

Note: placeholder/dummy data lives only in the `api.ts` files, behind `USE_MOCK` (`src/lib/http.ts`).

## Not built yet

No backend (mock data only), no authentication ("Log out" only shows a toast), no tests, no delete flows (edit exists for accounts and roles). Page access is set per role only; every account has a role.
