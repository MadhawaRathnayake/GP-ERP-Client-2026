import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { fetchAll, http } from "@/lib/http"

import type { NewPurchaseOrder, PurchaseOrder, PurchaseOrderSummary, PurchaseOrderUpdate } from "./types"

// Every PO, without lines, so the grid can search, sort and page them in the browser.
export function fetchPurchaseOrders(): Promise<PurchaseOrderSummary[]> {
  return fetchAll<PurchaseOrderSummary>("/purchase-orders")
}

export async function fetchPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const { data } = await http.get<PurchaseOrder>(`/purchase-orders/${id}`)
  return data
}

export async function createPurchaseOrder(body: NewPurchaseOrder): Promise<PurchaseOrder> {
  const { data } = await http.post<PurchaseOrder>("/purchase-orders", body)
  return data
}

export async function updatePurchaseOrder({ id, ...changes }: PurchaseOrderUpdate): Promise<PurchaseOrder> {
  const { data } = await http.patch<PurchaseOrder>(`/purchase-orders/${id}`, changes)
  return data
}

export async function approvePurchaseOrder(id: number): Promise<PurchaseOrder> {
  const { data } = await http.post<PurchaseOrder>(`/purchase-orders/${id}/approve`)
  return data
}

export async function rejectPurchaseOrder({ id, reason }: { id: number; reason: string }): Promise<PurchaseOrder> {
  const { data } = await http.post<PurchaseOrder>(`/purchase-orders/${id}/reject`, { reason })
  return data
}

export async function cancelPurchaseOrder({ id, reason }: { id: number; reason: string }): Promise<PurchaseOrder> {
  const { data } = await http.post<PurchaseOrder>(`/purchase-orders/${id}/cancel`, { reason })
  return data
}

export function usePurchaseOrders() {
  return useQuery({ queryKey: ["purchase-orders", "list"], queryFn: fetchPurchaseOrders })
}

export function usePurchaseOrder(id: string) {
  return useQuery({ queryKey: ["purchase-orders", "detail", id], queryFn: () => fetchPurchaseOrder(id) })
}

function usePurchaseOrderMutation<T>(mutationFn: (variables: T) => Promise<PurchaseOrder>, done: string, failed: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (order) => {
      // Creating approves the IR, and cancelling cancels it and its open GRN: refresh all three.
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      void queryClient.invalidateQueries({ queryKey: ["internal-requisitions"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes"] })
      toast.success(`${done} purchase order ${order.purchaseOrderNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not ${failed} purchase order: ${error.message}`)
    },
  })
}

export const useCreatePurchaseOrder = () => usePurchaseOrderMutation(createPurchaseOrder, "Created", "create")
export const useUpdatePurchaseOrder = () => usePurchaseOrderMutation(updatePurchaseOrder, "Saved", "save")
export const useApprovePurchaseOrder = () => usePurchaseOrderMutation(approvePurchaseOrder, "Approved", "approve")
export const useRejectPurchaseOrder = () => usePurchaseOrderMutation(rejectPurchaseOrder, "Rejected", "reject")
export const useCancelPurchaseOrder = () => usePurchaseOrderMutation(cancelPurchaseOrder, "Cancelled", "cancel")
