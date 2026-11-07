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

export async function fetchSalesManagers(): Promise<SalesManager[]> {
  const { data } = await http.get<SalesManager[]>("/quotations/sales-managers")
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

export function useQuotations() {
  return useQuery({ queryKey: ["quotations", "list"], queryFn: fetchQuotations })
}

export function useQuotation(id: string) {
  return useQuery({ queryKey: ["quotations", "detail", id], queryFn: () => fetchQuotation(id) })
}

export function useSalesManagers() {
  return useQuery({ queryKey: ["quotations", "sales-managers"], queryFn: fetchSalesManagers, staleTime: 5 * 60_000 })
}

export function useCreateQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createQuotation,
    onSuccess: (quotation) => {
      void queryClient.invalidateQueries({ queryKey: ["quotations"] })
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
      void queryClient.invalidateQueries({ queryKey: ["quotations"] })
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quotations"] })
      toast.success("Deleted the quotation")
    },
    onError: (error) => {
      toast.error(`Could not delete quotation: ${error.message}`)
    },
  })
}
