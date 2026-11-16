import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { mergeRows } from "@/app/liveList"
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

export async function fetchInvoice(id: string): Promise<Invoice> {
  const { data } = await http.get<Invoice>(`/invoices/${id}`)
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

// One scan on a draft: a unit's serial, an accessory serial or a pallet number.
export async function scanInvoiceSerial({ id, code }: { id: number; code: string }) {
  const { data } = await http.post<{ added: { serialItemId: number; serialNumber: string; sku: string }[]; skipped: number }>(
    `/invoices/${id}/serials/scan`,
    { code },
  )
  return data
}

// Takes a scanned unit off a draft (a wrong scan).
export async function releaseInvoiceSerial({ id, serialItemId }: { id: number; serialItemId: number }) {
  await http.delete(`/invoices/${id}/serials/${serialItemId}`)
}

// A quotation has at most one invoice that isn't cancelled, plus any cancelled ones.
export async function fetchQuotationInvoices(quotationId: number): Promise<InvoiceSummary[]> {
  const { data } = await http.get<{ data: InvoiceSummary[] }>("/invoices", { params: { quotationId, limit: 100 } })
  return data.data
}

export async function fetchInvoiceSalesManagers(): Promise<SalesManager[]> {
  const { data } = await http.get<SalesManager[]>("/invoices/sales-managers")
  return data
}

// The newest 100, to catch up on changes the live stream may have missed (./live.ts).
export async function fetchRecentInvoices(): Promise<InvoiceSummary[]> {
  const { data } = await http.get<{ data: InvoiceSummary[] }>("/invoices", { params: { page: 1, limit: 100 } })
  return data.data
}

// The rows of the invoices a live event named (at most 100). Not cached by the server, so never older than the event.
export async function fetchInvoicesByIds(ids: number[]): Promise<InvoiceSummary[]> {
  const { data } = await http.get<InvoiceSummary[]>("/invoices/by-ids", { params: { ids: ids.join(",") } })
  return data
}

// Every invoice (about 28,000), loaded once per session and then kept up to date by the live stream (./live.ts), so it
// never goes stale. The newest are read again at the end, so a change made while the pages loaded isn't lost.
// `enabled` lets a search box load them only once something is typed.
export function useInvoices(enabled = true) {
  return useQuery({
    queryKey: ["invoices", "list"],
    queryFn: async () => mergeRows(await fetchInvoices(), await fetchRecentInvoices()),
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export function useInvoice(id: string) {
  return useQuery({ queryKey: ["invoices", "detail", id], queryFn: () => fetchInvoice(id) })
}

// Creating and cancelling also change the quotation's status, and finalizing and cancelling the delivery note. Stock
// needs nothing here: live stock updates it.
export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createInvoice,
    onSuccess: (invoice) => {
      queryClient.setQueryData<InvoiceSummary[]>(["invoices", "list"], (list) => list && mergeRows(list, [invoice]))
      void queryClient.invalidateQueries({ queryKey: ["invoices", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["invoices", "quotation"] })
      void queryClient.invalidateQueries({ queryKey: ["quotations", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["delivery-notes", "detail"] })
      toast.success(`Created draft invoice ${invoiceNumberOf(invoice)}`)
    },
    onError: (error) => {
      toast.error(`Could not create invoice: ${error.message}`)
    },
  })
}

export function useCreateDirectInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createDirectInvoice,
    onSuccess: (invoice) => {
      queryClient.setQueryData<InvoiceSummary[]>(["invoices", "list"], (list) => list && mergeRows(list, [invoice]))
      void queryClient.invalidateQueries({ queryKey: ["invoices", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["invoices", "quotation"] })
      void queryClient.invalidateQueries({ queryKey: ["quotations", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["delivery-notes", "detail"] })
      toast.success(`Created draft invoice ${invoiceNumberOf(invoice)}`)
    },
    onError: (error) => {
      toast.error(`Could not create invoice: ${error.message}`)
    },
  })
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateInvoice,
    onSuccess: (invoice) => {
      queryClient.setQueryData<InvoiceSummary[]>(["invoices", "list"], (list) => list && mergeRows(list, [invoice]))
      void queryClient.invalidateQueries({ queryKey: ["invoices", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["invoices", "quotation"] })
      void queryClient.invalidateQueries({ queryKey: ["quotations", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["delivery-notes", "detail"] })
      toast.success(`Saved invoice ${invoiceNumberOf(invoice)}`)
    },
    onError: (error) => {
      toast.error(`Could not save invoice: ${error.message}`)
    },
  })
}

export function useFinalizeInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: finalizeInvoice,
    onSuccess: (invoice) => {
      queryClient.setQueryData<InvoiceSummary[]>(["invoices", "list"], (list) => list && mergeRows(list, [invoice]))
      void queryClient.invalidateQueries({ queryKey: ["invoices", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["invoices", "quotation"] })
      void queryClient.invalidateQueries({ queryKey: ["quotations", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["delivery-notes", "detail"] })
      toast.success(`Finalized invoice ${invoiceNumberOf(invoice)}`)
    },
    onError: (error) => {
      toast.error(`Could not finalize invoice: ${error.message}`)
    },
  })
}

export function useCancelInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cancelInvoice,
    onSuccess: (invoice) => {
      queryClient.setQueryData<InvoiceSummary[]>(["invoices", "list"], (list) => list && mergeRows(list, [invoice]))
      void queryClient.invalidateQueries({ queryKey: ["invoices", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["invoices", "quotation"] })
      void queryClient.invalidateQueries({ queryKey: ["quotations", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["delivery-notes", "detail"] })
      toast.success(`Cancelled invoice ${invoiceNumberOf(invoice)}`)
    },
    onError: (error) => {
      toast.error(`Could not cancel invoice: ${error.message}`)
    },
  })
}

// No toasts: the scan page shows each result on the phone itself.
export function useScanInvoiceSerial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: scanInvoiceSerial,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["invoices", "detail"] }),
  })
}

export function useReleaseInvoiceSerial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: releaseInvoiceSerial,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["invoices", "detail"] }),
    onError: (error) => {
      toast.error(`Could not take the unit off: ${error.message}`)
    },
  })
}

export function useQuotationInvoices(quotationId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["invoices", "quotation", quotationId],
    queryFn: () => fetchQuotationInvoices(quotationId),
    enabled,
  })
}

export function useInvoiceSalesManagers(enabled: boolean) {
  return useQuery({ queryKey: ["invoices", "sales-managers"], queryFn: fetchInvoiceSalesManagers, enabled, staleTime: 30 * 60_000, gcTime: 60 * 60_000 })
}
