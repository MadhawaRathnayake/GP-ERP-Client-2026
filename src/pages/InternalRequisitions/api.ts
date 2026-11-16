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

export function useCreateInternalRequisition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createInternalRequisition,
    onSuccess: (requisition) => {
      void queryClient.invalidateQueries({ queryKey: ["internal-requisitions"] })
      // Cancelling an IR cancels its purchase order and its open GRN.
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes"] })
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
      void queryClient.invalidateQueries({ queryKey: ["internal-requisitions"] })
      // Cancelling an IR cancels its purchase order and its open GRN.
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes"] })
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
      void queryClient.invalidateQueries({ queryKey: ["internal-requisitions"] })
      // Cancelling an IR cancels its purchase order and its open GRN.
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes"] })
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
      void queryClient.invalidateQueries({ queryKey: ["internal-requisitions"] })
      // Cancelling an IR cancels its purchase order and its open GRN.
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes"] })
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
      void queryClient.invalidateQueries({ queryKey: ["internal-requisitions"] })
      // Cancelling an IR cancels its purchase order and its open GRN.
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes"] })
      toast.success(`Cancelled internal requisition ${requisition.internalRequisitionNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not cancel internal requisition: ${error.message}`)
    },
  })
}
