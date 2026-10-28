---
name: add-feature-data
description: Use when a GP ERP page or report needs to load or save data (new entity, API endpoint, list, create form). Covers type, API call with mock data, TanStack Query hooks.
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

Every function has a mock branch (used while `USE_MOCK = true` in `src/lib/http.ts`) and the real axios call. Mock data stays in this file, next to the calls it stands in for. Lists return the **whole** list: `DataGrid` searches, sorts and pages in the browser.

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { http, mockDelay, USE_MOCK } from "@/lib/http"

import type { Invoice, NewInvoice } from "./types"

const mockInvoices: Invoice[] = [
  { id: "1", number: "INV-001", total: 120, createdAt: "2026-10-01T09:00:00Z" },
]

export async function fetchInvoices(): Promise<Invoice[]> {
  if (USE_MOCK) {
    await mockDelay()
    return [...mockInvoices]
  }
  const { data } = await http.get<Invoice[]>("/invoices")
  return data
}

export async function createInvoice(newInvoice: NewInvoice): Promise<Invoice> {
  if (USE_MOCK) {
    await mockDelay()
    const invoice: Invoice = { ...newInvoice, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    mockInvoices.unshift(invoice)
    return invoice
  }
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

If the endpoint pages its results, read every page and join them, as `fetchProducts` does in `src/pages/Products/api.ts`.

## 3. Use in the page

```tsx
import { useCreateInvoice, useInvoices } from "./api"

const invoices = useInvoices()          // pass to <DataGrid query={invoices} … />
const createInvoice = useCreateInvoice()
createInvoice.mutate(values, { onSuccess: () => navigate("/invoices") })
```

Rules: pages never import `http` or axios — only the hooks from `./api`. Query keys start with the feature name (`["invoices", ...]`) so one `invalidateQueries` refreshes everything for that feature.
