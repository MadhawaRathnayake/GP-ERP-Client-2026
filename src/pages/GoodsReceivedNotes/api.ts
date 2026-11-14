import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { fetchAll, http } from "@/lib/http"
import type { UnitInput } from "@/pages/SerialItems/types"

import type { DeliveryFields, GoodsReceivedNote, GoodsReceivedNoteSummary, NewGoodsReceivedNote, OrderReceipt } from "./types"

// Every GRN, without lines, so the grid can search, sort and page them in the browser.
export function fetchGoodsReceivedNotes(): Promise<GoodsReceivedNoteSummary[]> {
  return fetchAll<GoodsReceivedNoteSummary>("/goods-received-notes")
}

export async function fetchGoodsReceivedNote(id: string): Promise<GoodsReceivedNote> {
  const { data } = await http.get<GoodsReceivedNote>(`/goods-received-notes/${id}`)
  return data
}

export async function fetchOrderReceipt(internalRequisitionId: string): Promise<OrderReceipt> {
  const { data } = await http.get<OrderReceipt>(`/goods-received-notes/orders/${internalRequisitionId}`)
  return data
}

// The order's first delivery, which makes its GRN.
export async function createGoodsReceivedNote(body: NewGoodsReceivedNote): Promise<GoodsReceivedNote> {
  const { data } = await http.post<GoodsReceivedNote>("/goods-received-notes", body)
  return data
}

export async function addDelivery({ id, ...delivery }: DeliveryFields & { id: number }): Promise<GoodsReceivedNote> {
  const { data } = await http.post<GoodsReceivedNote>(`/goods-received-notes/${id}/deliveries`, delivery)
  return data
}

// Serials for units of a serial-tracked line; each unit goes into stock.
export async function addSerials({ id, productId, units }: { id: number; productId: string; units: UnitInput[] }): Promise<GoodsReceivedNote> {
  const { data } = await http.post<GoodsReceivedNote>(`/goods-received-notes/${id}/serials`, { productId, units })
  return data
}

export function useGoodsReceivedNotes() {
  return useQuery({ queryKey: ["goods-received-notes", "list"], queryFn: fetchGoodsReceivedNotes })
}

export function useGoodsReceivedNote(id: string) {
  return useQuery({ queryKey: ["goods-received-notes", "detail", id], queryFn: () => fetchGoodsReceivedNote(id) })
}

// The IR and PO pages pass `enabled` only when the user may view GRNs and the order can have them.
export function useOrderReceipt(internalRequisitionId: string, enabled = true) {
  return useQuery({
    queryKey: ["goods-received-notes", "order", internalRequisitionId],
    queryFn: () => fetchOrderReceipt(internalRequisitionId),
    enabled,
  })
}

function useGoodsReceivedNoteMutation<T>(mutationFn: (variables: T) => Promise<GoodsReceivedNote>, done: string, failed: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (note) => {
      // A delivery can complete the purchase order; serials make units. Stock updates by itself (live stock).
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes"] })
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      void queryClient.invalidateQueries({ queryKey: ["serial-items"] })
      toast.success(`${done} ${note.grnNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not ${failed}: ${error.message}`)
    },
  })
}

export const useCreateGoodsReceivedNote = () =>
  useGoodsReceivedNoteMutation(createGoodsReceivedNote, "Delivery recorded on", "record the delivery")
export const useAddDelivery = () => useGoodsReceivedNoteMutation(addDelivery, "Delivery recorded on", "record the delivery")
export const useAddSerials = () => useGoodsReceivedNoteMutation(addSerials, "Serial numbers saved on", "save the serial numbers")
