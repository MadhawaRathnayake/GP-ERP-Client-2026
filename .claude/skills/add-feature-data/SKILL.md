---
name: add-feature-data
description: Use when a GP ERP page or report needs to load or save data (new entity, API endpoint, list, create form). Covers type, API call with mock data, TanStack Query hooks.
---

# Load and save data

Follow the existing Items/Admin pattern exactly. Three files, then use the hooks in the page.

## 1. Type — `src/types/<feature>.ts`

```ts
export interface Invoice {
  id: string
  number: string
  total: number
  createdAt: string
}

export type NewInvoice = Omit<Invoice, "id" | "createdAt">
```

## 2. API calls — append to `src/api/client.ts`

Every function has a mock branch (used while `USE_MOCK = true`) and the real axios call (used later). Reuse the existing `api`, `USE_MOCK` and `delay`.

```ts
const mockInvoices: Invoice[] = [
  { id: "1", number: "INV-001", total: 120, createdAt: "2026-10-01T09:00:00Z" },
]

export async function fetchInvoices(): Promise<Invoice[]> {
  if (USE_MOCK) {
    await delay()
    return [...mockInvoices]
  }
  const { data } = await api.get<Invoice[]>("/invoices")
  return data
}

export async function createInvoice(newInvoice: NewInvoice): Promise<Invoice> {
  if (USE_MOCK) {
    await delay()
    const invoice: Invoice = { ...newInvoice, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    mockInvoices.unshift(invoice)
    return invoice
  }
  const { data } = await api.post<Invoice>("/invoices", newInvoice)
  return data
}
```

Add the type import at the top of `client.ts`.

## 3. Hooks — `src/hooks/use<Feature>.ts`

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { createInvoice, fetchInvoices } from "@/api/client"

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

## 4. Use in the page

```tsx
const { data, isPending, isError, error } = useInvoices()
const createInvoice = useCreateInvoice()
createInvoice.mutate(values, { onSuccess: () => navigate("/invoices") })
```

Rules: pages never import `api` or axios. Query keys start with the feature name (`["invoices", ...]`) so one `invalidateQueries` refreshes everything for that feature.
