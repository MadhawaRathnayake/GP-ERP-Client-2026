import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { mergeRows } from "@/app/liveList"
import { fetchAll, http } from "@/lib/http"

import type {
  InternalRequisition,
  InternalRequisitionSummary,
  InternalRequisitionUpdate,
  NewInternalRequisition,
} from "./types"

// Every IR, without lines, so the grid can search, sort and page them in the browser.
export function fetchInternalRequisitions(): Promise<InternalRequisitionSummary[]> {
  return fetchAll<InternalRequisitionSummary>("/internal-requisitions")
}

export async function fetchInternalRequisition(id: string): Promise<InternalRequisition> {
  const { data } = await http.get<InternalRequisition>(`/internal-requisitions/${id}`)
  return data
}

export async function createInternalRequisition(body: NewInternalRequisition): Promise<InternalRequisition> {
  const { data } = await http.post<InternalRequisition>("/internal-requisitions", body)
  return data
}

export async function updateInternalRequisition({ id, ...changes }: InternalRequisitionUpdate): Promise<InternalRequisition> {
  const { data } = await http.patch<InternalRequisition>(`/internal-requisitions/${id}`, changes)
  return data
}

export async function approveInternalRequisition(id: number): Promise<InternalRequisition> {
  const { data } = await http.post<InternalRequisition>(`/internal-requisitions/${id}/approve`)
  return data
}

export async function rejectInternalRequisition({ id, reason }: { id: number; reason: string }): Promise<InternalRequisition> {
  const { data } = await http.post<InternalRequisition>(`/internal-requisitions/${id}/reject`, { reason })
  return data
}

export async function cancelInternalRequisition({ id, reason }: { id: number; reason: string }): Promise<InternalRequisition> {
  const { data } = await http.post<InternalRequisition>(`/internal-requisitions/${id}/cancel`, { reason })
  return data
}

// The newest 100, to catch up on changes the live stream may have missed (./live.ts).
export async function fetchRecentInternalRequisitions(): Promise<InternalRequisitionSummary[]> {
  const { data } = await http.get<{ data: InternalRequisitionSummary[] }>("/internal-requisitions", { params: { page: 1, limit: 100 } })
  return data.data
}

// The rows of the internal requisitions a live event named (at most 100). Not cached by the server, so never older than the event.
export async function fetchInternalRequisitionsByIds(ids: number[]): Promise<InternalRequisitionSummary[]> {
  const { data } = await http.get<InternalRequisitionSummary[]>("/internal-requisitions/by-ids", { params: { ids: ids.join(",") } })
  return data
}

// Every IR, loaded once per session and then kept up to date by the live stream (./live.ts), so it never goes stale.
// The newest are read again at the end, so a change made while the pages loaded isn't lost.
export function useInternalRequisitions() {
  return useQuery({
    queryKey: ["internal-requisitions", "list"],
    queryFn: async () => mergeRows(await fetchInternalRequisitions(), await fetchRecentInternalRequisitions()),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

// enabled = false skips loading (the purchase order form loads its IR only for users who may view IRs).
export function useInternalRequisition(id: string, enabled = true) {
  return useQuery({ queryKey: ["internal-requisitions", "detail", id], queryFn: () => fetchInternalRequisition(id), enabled })
}

export function useCreateInternalRequisition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createInternalRequisition,
    onSuccess: (requisition) => {
      queryClient.setQueryData<InternalRequisitionSummary[]>(["internal-requisitions", "list"], (list) => list && mergeRows(list, [requisition]))
      void queryClient.invalidateQueries({ queryKey: ["internal-requisitions", "detail"] })
      // Cancelling an IR cancels its purchase order and its open GRN.
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "order"] })
      toast.success(`Created internal requisition ${requisition.internalRequisitionNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not create internal requisition: ${error.message}`)
    },
  })
}

export function useUpdateInternalRequisition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateInternalRequisition,
    onSuccess: (requisition) => {
      queryClient.setQueryData<InternalRequisitionSummary[]>(["internal-requisitions", "list"], (list) => list && mergeRows(list, [requisition]))
      void queryClient.invalidateQueries({ queryKey: ["internal-requisitions", "detail"] })
      // Cancelling an IR cancels its purchase order and its open GRN.
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "order"] })
      toast.success(`Saved internal requisition ${requisition.internalRequisitionNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not save internal requisition: ${error.message}`)
    },
  })
}

export function useApproveInternalRequisition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: approveInternalRequisition,
    onSuccess: (requisition) => {
      queryClient.setQueryData<InternalRequisitionSummary[]>(["internal-requisitions", "list"], (list) => list && mergeRows(list, [requisition]))
      void queryClient.invalidateQueries({ queryKey: ["internal-requisitions", "detail"] })
      // Cancelling an IR cancels its purchase order and its open GRN.
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "order"] })
      toast.success(`Approved internal requisition ${requisition.internalRequisitionNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not approve internal requisition: ${error.message}`)
    },
  })
}

export function useRejectInternalRequisition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: rejectInternalRequisition,
    onSuccess: (requisition) => {
      queryClient.setQueryData<InternalRequisitionSummary[]>(["internal-requisitions", "list"], (list) => list && mergeRows(list, [requisition]))
      void queryClient.invalidateQueries({ queryKey: ["internal-requisitions", "detail"] })
      // Cancelling an IR cancels its purchase order and its open GRN.
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "order"] })
      toast.success(`Rejected internal requisition ${requisition.internalRequisitionNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not reject internal requisition: ${error.message}`)
    },
  })
}

export function useCancelInternalRequisition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cancelInternalRequisition,
    onSuccess: (requisition) => {
      queryClient.setQueryData<InternalRequisitionSummary[]>(["internal-requisitions", "list"], (list) => list && mergeRows(list, [requisition]))
      void queryClient.invalidateQueries({ queryKey: ["internal-requisitions", "detail"] })
      // Cancelling an IR cancels its purchase order and its open GRN.
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "order"] })
      toast.success(`Cancelled internal requisition ${requisition.internalRequisitionNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not cancel internal requisition: ${error.message}`)
    },
  })
}
