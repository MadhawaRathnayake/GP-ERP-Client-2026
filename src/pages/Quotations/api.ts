import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { fetchAll, http } from "@/lib/http"

import { type NewQuotation, type Quotation, type QuotationSummary, type QuotationUpdate, type SalesManager } from "./types"

// Every quotation that isn't deleted, without lines, so the grid can search, sort and page them in the browser.
export function fetchQuotations(): Promise<QuotationSummary[]> {
  return fetchAll<QuotationSummary>("/quotations")
}

export async function fetchQuotation(id: string): Promise<Quotation> {
  const { data } = await http.get<Quotation>(`/quotations/${id}`)
  return data
}

export async function createQuotation(newQuotation: NewQuotation): Promise<Quotation> {
  const { data } = await http.post<Quotation>("/quotations", newQuotation)
  return data
}

export async function updateQuotation({ id, ...changes }: QuotationUpdate): Promise<Quotation> {
  const { data } = await http.patch<Quotation>(`/quotations/${id}`, changes)
  return data
}

// Soft delete: the server sets isDeleted = true. `updateQuotation({ id, isDeleted: false })` restores it.
export async function deleteQuotation(id: number): Promise<void> {
  await http.delete(`/quotations/${id}`)
}

export async function fetchSalesManagers(): Promise<SalesManager[]> {
  const { data } = await http.get<SalesManager[]>("/quotations/sales-managers")
  return data
}

// The newest 100, to catch up on changes the live stream may have missed (./live.ts).
export async function fetchRecentQuotations(): Promise<QuotationSummary[]> {
  const { data } = await http.get<{ data: QuotationSummary[] }>("/quotations", { params: { page: 1, limit: 100 } })
  return data.data
}

// The rows of the quotations a live event named (at most 100), deleted ones included. Not cached by the server, so
// never older than the event.
export async function fetchQuotationsByIds(ids: number[]): Promise<QuotationSummary[]> {
  const { data } = await http.get<QuotationSummary[]>("/quotations/by-ids", { params: { ids: ids.join(",") } })
  return data
}

// Every quotation that isn't deleted, loaded once per session and then kept up to date by the live stream (./live.ts),
// so it never goes stale. The newest are read again at the end, so a change made while the pages loaded isn't lost.
export function useQuotations() {
  return useQuery({
    queryKey: ["quotations", "list"],
    queryFn: async () => mergeQuotations(await fetchQuotations(), await fetchRecentQuotations()),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export function useQuotation(id: string) {
  return useQuery({ queryKey: ["quotations", "detail", id], queryFn: () => fetchQuotation(id) })
}

export function useCreateQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createQuotation,
    onSuccess: (quotation) => {
      queryClient.setQueryData<QuotationSummary[]>(["quotations", "list"], (list) => list && mergeQuotations(list, [quotation]))
      void queryClient.invalidateQueries({ queryKey: ["quotations", "detail"] })
      toast.success(`Created quotation ${quotation.quotationNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not create quotation: ${error.message}`)
    },
  })
}

// Used for edits, status changes and restoring, so the message is general.
export function useUpdateQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateQuotation,
    onSuccess: (quotation) => {
      queryClient.setQueryData<QuotationSummary[]>(["quotations", "list"], (list) => list && mergeQuotations(list, [quotation]))
      void queryClient.invalidateQueries({ queryKey: ["quotations", "detail"] })
      toast.success(`Saved quotation ${quotation.quotationNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not save quotation: ${error.message}`)
    },
  })
}

export function useDeleteQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteQuotation,
    onSuccess: (_, id) => {
      queryClient.setQueryData<QuotationSummary[]>(["quotations", "list"], (list) => list?.filter((quotation) => quotation.id !== id))
      void queryClient.invalidateQueries({ queryKey: ["quotations", "detail"] })
      toast.success("Deleted the quotation")
    },
    onError: (error) => {
      toast.error(`Could not delete quotation: ${error.message}`)
    },
  })
}

export function useSalesManagers() {
  return useQuery({ queryKey: ["quotations", "sales-managers"], queryFn: fetchSalesManagers, staleTime: 30 * 60_000, gcTime: 60 * 60_000 })
}

// The list with these rows put in: a known quotation is replaced, a new one goes first (newest first, like the server),
// and a deleted one is taken out, since the list holds only quotations that aren't deleted. The same array when nothing
// changed, so the grid doesn't re-render for nothing.
export function mergeQuotations(list: QuotationSummary[], rows: QuotationSummary[]): QuotationSummary[] {
  const byId = new Map(rows.map((row) => [row.id, row]))
  let changed = false
  const merged: QuotationSummary[] = []
  for (const quotation of list) {
    const row = byId.get(quotation.id)
    byId.delete(quotation.id)
    if (!row || JSON.stringify(row) === JSON.stringify(quotation)) merged.push(quotation)
    else {
      changed = true
      if (!row.isDeleted) merged.push(row)
    }
  }
  const added = [...byId.values()].filter((row) => !row.isDeleted).sort((a, b) => b.id - a.id)
  if (added.length === 0) return changed ? merged : list
  return [...added, ...merged]
}
