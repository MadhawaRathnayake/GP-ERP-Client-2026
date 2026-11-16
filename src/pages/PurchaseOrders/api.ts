import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { mergeRows } from "@/app/liveList"
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

// The newest 100, to catch up on changes the live stream may have missed (./live.ts).
export async function fetchRecentPurchaseOrders(): Promise<PurchaseOrderSummary[]> {
  const { data } = await http.get<{ data: PurchaseOrderSummary[] }>("/purchase-orders", { params: { page: 1, limit: 100 } })
  return data.data
}

// The rows of the purchase orders a live event named (at most 100). Not cached by the server, so never older than the event.
export async function fetchPurchaseOrdersByIds(ids: number[]): Promise<PurchaseOrderSummary[]> {
  const { data } = await http.get<PurchaseOrderSummary[]>("/purchase-orders/by-ids", { params: { ids: ids.join(",") } })
  return data
}

// Every PO, loaded once per session and then kept up to date by the live stream (./live.ts), so it never goes stale.
// The newest are read again at the end, so a change made while the pages loaded isn't lost.
export function usePurchaseOrders() {
  return useQuery({
    queryKey: ["purchase-orders", "list"],
    queryFn: async () => mergeRows(await fetchPurchaseOrders(), await fetchRecentPurchaseOrders()),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export function usePurchaseOrder(id: string) {
  return useQuery({ queryKey: ["purchase-orders", "detail", id], queryFn: () => fetchPurchaseOrder(id) })
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: (order) => {
      // Creating approves the IR, and cancelling cancels it and its open GRN: refresh all three.
      queryClient.setQueryData<PurchaseOrderSummary[]>(["purchase-orders", "list"], (list) => list && mergeRows(list, [order]))
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["internal-requisitions", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "order"] })
      toast.success(`Created purchase order ${order.purchaseOrderNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not create purchase order: ${error.message}`)
    },
  })
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updatePurchaseOrder,
    onSuccess: (order) => {
      // Creating approves the IR, and cancelling cancels it and its open GRN: refresh all three.
      queryClient.setQueryData<PurchaseOrderSummary[]>(["purchase-orders", "list"], (list) => list && mergeRows(list, [order]))
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["internal-requisitions", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "order"] })
      toast.success(`Saved purchase order ${order.purchaseOrderNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not save purchase order: ${error.message}`)
    },
  })
}

export function useApprovePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: approvePurchaseOrder,
    onSuccess: (order) => {
      // Creating approves the IR, and cancelling cancels it and its open GRN: refresh all three.
      queryClient.setQueryData<PurchaseOrderSummary[]>(["purchase-orders", "list"], (list) => list && mergeRows(list, [order]))
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["internal-requisitions", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "order"] })
      toast.success(`Approved purchase order ${order.purchaseOrderNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not approve purchase order: ${error.message}`)
    },
  })
}

export function useRejectPurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: rejectPurchaseOrder,
    onSuccess: (order) => {
      // Creating approves the IR, and cancelling cancels it and its open GRN: refresh all three.
      queryClient.setQueryData<PurchaseOrderSummary[]>(["purchase-orders", "list"], (list) => list && mergeRows(list, [order]))
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["internal-requisitions", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "order"] })
      toast.success(`Rejected purchase order ${order.purchaseOrderNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not reject purchase order: ${error.message}`)
    },
  })
}

export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cancelPurchaseOrder,
    onSuccess: (order) => {
      // Creating approves the IR, and cancelling cancels it and its open GRN: refresh all three.
      queryClient.setQueryData<PurchaseOrderSummary[]>(["purchase-orders", "list"], (list) => list && mergeRows(list, [order]))
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["internal-requisitions", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "order"] })
      toast.success(`Cancelled purchase order ${order.purchaseOrderNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not cancel purchase order: ${error.message}`)
    },
  })
}
