import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

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

export function useInternalRequisitions() {
  return useQuery({ queryKey: ["internal-requisitions", "list"], queryFn: fetchInternalRequisitions })
}

// enabled = false skips loading (the purchase order form loads its IR only for users who may view IRs).
export function useInternalRequisition(id: string, enabled = true) {
  return useQuery({ queryKey: ["internal-requisitions", "detail", id], queryFn: () => fetchInternalRequisition(id), enabled })
}

function useInternalRequisitionMutation<T>(mutationFn: (variables: T) => Promise<InternalRequisition>, done: string, failed: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (requisition) => {
      void queryClient.invalidateQueries({ queryKey: ["internal-requisitions"] })
      // Cancelling an IR cancels its purchase order.
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      toast.success(`${done} internal requisition ${requisition.internalRequisitionNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not ${failed} internal requisition: ${error.message}`)
    },
  })
}

export const useCreateInternalRequisition = () => useInternalRequisitionMutation(createInternalRequisition, "Created", "create")
export const useUpdateInternalRequisition = () => useInternalRequisitionMutation(updateInternalRequisition, "Saved", "save")
export const useApproveInternalRequisition = () => useInternalRequisitionMutation(approveInternalRequisition, "Approved", "approve")
export const useRejectInternalRequisition = () => useInternalRequisitionMutation(rejectInternalRequisition, "Rejected", "reject")
export const useCancelInternalRequisition = () => useInternalRequisitionMutation(cancelInternalRequisition, "Cancelled", "cancel")
