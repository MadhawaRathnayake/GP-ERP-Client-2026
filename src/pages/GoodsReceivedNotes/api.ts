import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { mergeRows } from "@/app/liveList"
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

export async function fetchOrderReceipt(internalRequisitionId: string): Promise<OrderReceipt> {
  const { data } = await http.get<OrderReceipt>(`/goods-received-notes/orders/${internalRequisitionId}`)
  return data
}

// The newest 100, to catch up on changes the live stream may have missed (./live.ts).
export async function fetchRecentGoodsReceivedNotes(): Promise<GoodsReceivedNoteSummary[]> {
  const { data } = await http.get<{ data: GoodsReceivedNoteSummary[] }>("/goods-received-notes", { params: { page: 1, limit: 100 } })
  return data.data
}

// The rows of the GRNs a live event named (at most 100). Not cached by the server, so never older than the event.
export async function fetchGoodsReceivedNotesByIds(ids: number[]): Promise<GoodsReceivedNoteSummary[]> {
  const { data } = await http.get<GoodsReceivedNoteSummary[]>("/goods-received-notes/by-ids", { params: { ids: ids.join(",") } })
  return data
}

// Every GRN, loaded once per session and then kept up to date by the live stream (./live.ts), so it never goes stale.
// The newest are read again at the end, so a change made while the pages loaded isn't lost.
export function useGoodsReceivedNotes() {
  return useQuery({
    queryKey: ["goods-received-notes", "list"],
    queryFn: async () => mergeRows(await fetchGoodsReceivedNotes(), await fetchRecentGoodsReceivedNotes()),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export function useGoodsReceivedNote(id: string) {
  return useQuery({ queryKey: ["goods-received-notes", "detail", id], queryFn: () => fetchGoodsReceivedNote(id) })
}

export function useCreateGoodsReceivedNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createGoodsReceivedNote,
    onSuccess: (note) => {
      // A delivery can complete the purchase order; serials make units. Stock updates by itself (live stock).
      queryClient.setQueryData<GoodsReceivedNoteSummary[]>(["goods-received-notes", "list"], (list) => list && mergeRows(list, [note]))
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "order"] })
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["serial-items"] })
      toast.success(`Delivery recorded on ${note.grnNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not record the delivery: ${error.message}`)
    },
  })
}

export function useAddDelivery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addDelivery,
    onSuccess: (note) => {
      // A delivery can complete the purchase order; serials make units. Stock updates by itself (live stock).
      queryClient.setQueryData<GoodsReceivedNoteSummary[]>(["goods-received-notes", "list"], (list) => list && mergeRows(list, [note]))
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "order"] })
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["serial-items"] })
      toast.success(`Delivery recorded on ${note.grnNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not record the delivery: ${error.message}`)
    },
  })
}

export function useAddSerials() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addSerials,
    onSuccess: (note) => {
      // A delivery can complete the purchase order; serials make units. Stock updates by itself (live stock).
      queryClient.setQueryData<GoodsReceivedNoteSummary[]>(["goods-received-notes", "list"], (list) => list && mergeRows(list, [note]))
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes", "order"] })
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["serial-items"] })
      toast.success(`Serial numbers saved on ${note.grnNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not save the serial numbers: ${error.message}`)
    },
  })
}

// The IR and PO pages pass `enabled` only when the user may view GRNs and the order can have them.
export function useOrderReceipt(internalRequisitionId: string, enabled = true) {
  return useQuery({
    queryKey: ["goods-received-notes", "order", internalRequisitionId],
    queryFn: () => fetchOrderReceipt(internalRequisitionId),
    enabled,
  })
}
