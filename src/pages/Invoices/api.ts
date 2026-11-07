import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { fetchAll, http } from "@/lib/http"
import type { SalesManager } from "@/pages/Quotations/types"

import {
  invoiceNumberOf,
  type Invoice,
  type InvoiceSummary,
  type InvoiceUpdate,
  type NewDirectInvoice,
  type NewInvoice,
} from "./types"

// Every invoice, without lines, so the grid can search, sort and page them in the browser.
export function fetchInvoices(): Promise<InvoiceSummary[]> {
  return fetchAll<InvoiceSummary>("/invoices")
}

// A quotation has at most one invoice that isn't cancelled, plus any cancelled ones.
export async function fetchQuotationInvoices(quotationId: number): Promise<InvoiceSummary[]> {
  const { data } = await http.get<{ data: InvoiceSummary[] }>("/invoices", { params: { quotationId, limit: 100 } })
  return data.data
}

export async function fetchInvoice(id: string): Promise<Invoice> {
  const { data } = await http.get<Invoice>(`/invoices/${id}`)
  return data
}

export async function fetchInvoiceSalesManagers(): Promise<SalesManager[]> {
  const { data } = await http.get<SalesManager[]>("/invoices/sales-managers")
  return data
}

export async function createInvoice(newInvoice: NewInvoice): Promise<Invoice> {
  const { data } = await http.post<Invoice>("/invoices", newInvoice)
  return data
}

export async function createDirectInvoice(newInvoice: NewDirectInvoice): Promise<Invoice> {
  const { data } = await http.post<Invoice>("/invoices/direct", newInvoice)
  return data
}

export async function updateInvoice({ id, ...changes }: InvoiceUpdate): Promise<Invoice> {
  const { data } = await http.patch<Invoice>(`/invoices/${id}`, changes)
  return data
}

export async function finalizeInvoice(id: number): Promise<Invoice> {
  const { data } = await http.post<Invoice>(`/invoices/${id}/finalize`)
  return data
}

export async function cancelInvoice(id: number): Promise<Invoice> {
  const { data } = await http.post<Invoice>(`/invoices/${id}/cancel`)
  return data
}

export function useInvoices() {
  return useQuery({ queryKey: ["invoices", "list"], queryFn: fetchInvoices })
}

export function useQuotationInvoices(quotationId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["invoices", "quotation", quotationId],
    queryFn: () => fetchQuotationInvoices(quotationId),
    enabled,
  })
}

export function useInvoice(id: string) {
  return useQuery({ queryKey: ["invoices", "detail", id], queryFn: () => fetchInvoice(id) })
}

export function useInvoiceSalesManagers(enabled: boolean) {
  return useQuery({ queryKey: ["invoices", "sales-managers"], queryFn: fetchInvoiceSalesManagers, enabled, staleTime: 5 * 60_000 })
}

// Creating and cancelling also change the quotation's status. Stock needs nothing here: live stock updates it.
function useInvoiceMutation<T>(mutationFn: (variables: T) => Promise<Invoice>, done: string, failed: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (invoice) => {
      void queryClient.invalidateQueries({ queryKey: ["invoices"] })
      void queryClient.invalidateQueries({ queryKey: ["quotations"] })
      toast.success(`${done} invoice ${invoiceNumberOf(invoice)}`)
    },
    onError: (error) => {
      toast.error(`Could not ${failed} invoice: ${error.message}`)
    },
  })
}

export const useCreateInvoice = () => useInvoiceMutation(createInvoice, "Created draft", "create")
export const useCreateDirectInvoice = () => useInvoiceMutation(createDirectInvoice, "Created draft", "create")
export const useUpdateInvoice = () => useInvoiceMutation(updateInvoice, "Saved", "save")
export const useFinalizeInvoice = () => useInvoiceMutation(finalizeInvoice, "Finalized", "finalize")
export const useCancelInvoice = () => useInvoiceMutation(cancelInvoice, "Cancelled", "cancel")
