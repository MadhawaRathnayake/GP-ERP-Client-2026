---
name: add-feature-data
description: Use when a GP ERP page or report needs to load or save data (new entity, API endpoint, list, create form). Covers type, API call, TanStack Query hooks.
---

# Load and save data

Follow the existing Products/Admin pattern exactly. Two files in the feature folder, then use the hooks in the page.

## 1. Type — `src/pages/<Feature>/types.ts`

```ts
export interface Invoice {
  id: string
  number: string
  total: number
  createdAt: string
}

export type NewInvoice = Omit<Invoice, "id" | "createdAt">
```

## 2. API calls and hooks — `src/pages/<Feature>/api.ts`

Use the shared `http` axios instance (base URL, session cookie). Failed requests reject with `ApiError`, so `error.message` is the server's message and is safe to show. Lists return the **whole** list: `DataGrid` searches, sorts and pages in the browser. For a paginated endpoint (`{ data, total }`), `fetchAll` reads every page.

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { fetchAll, http } from "@/lib/http"

import type { Invoice, NewInvoice } from "./types"

export function fetchInvoices(): Promise<Invoice[]> {
  return fetchAll<Invoice>("/invoices")
}

export async function createInvoice(newInvoice: NewInvoice): Promise<Invoice> {
  const { data } = await http.post<Invoice>("/invoices", newInvoice)
  return data
}

export function useInvoices() {
  return useQuery({ queryKey: ["invoices"], queryFn: fetchInvoices })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createInvoice,
    onSuccess: (invoice) => {
      void queryClient.invalidateQueries({ queryKey: ["invoices"] })
      toast.success(`Created ${invoice.number}`)
    },
    onError: (error) => {
      toast.error(`Could not create invoice: ${error.message}`)
    },
  })
}
```

## 3. Use in the page

```tsx
import { useCreateInvoice, useInvoices } from "./api"

const invoices = useInvoices()          // pass to <DataGrid query={invoices} … />
const createInvoice = useCreateInvoice()
createInvoice.mutate(values, { onSuccess: () => navigate("/invoices") })
```

Rules: pages never import `http` or axios — only the hooks from `./api`. Query keys start with the feature name (`["invoices", ...]`) so one `invalidateQueries` refreshes everything for that feature.

## Permissions

Hide buttons the user cannot use with `useCan()` from `@/app/auth` (the server enforces the same rules):

```tsx
const can = useCan()
{can("INVOICES.CREATE") && <Button>New invoice</Button>}
```

New permission keys are added in the backend (`GP-ERP-Server/src/platform/security/permissions.ts`) and then to `PermissionKey` in `src/app/auth.ts`.
