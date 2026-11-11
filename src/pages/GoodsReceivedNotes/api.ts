import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { fetchAll, http } from "@/lib/http"

import type {
  GoodsReceivedNote,
  GoodsReceivedNoteSummary,
  GoodsReceivedNoteUpdate,
  NewGoodsReceivedNote,
  OrderReceipt,
} from "./types"

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

export async function createGoodsReceivedNote(body: NewGoodsReceivedNote): Promise<GoodsReceivedNote> {
  const { data } = await http.post<GoodsReceivedNote>("/goods-received-notes", body)
  return data
}

export async function updateGoodsReceivedNote({ id, ...changes }: GoodsReceivedNoteUpdate): Promise<GoodsReceivedNote> {
  const { data } = await http.patch<GoodsReceivedNote>(`/goods-received-notes/${id}`, changes)
  return data
}

export async function approveGoodsReceivedNote(id: number): Promise<GoodsReceivedNote> {
  const { data } = await http.post<GoodsReceivedNote>(`/goods-received-notes/${id}/approve`)
  return data
}

export async function rejectGoodsReceivedNote({ id, reason }: { id: number; reason: string }): Promise<GoodsReceivedNote> {
  const { data } = await http.post<GoodsReceivedNote>(`/goods-received-notes/${id}/reject`, { reason })
  return data
}

export async function cancelGoodsReceivedNote({ id, reason }: { id: number; reason: string }): Promise<GoodsReceivedNote> {
  const { data } = await http.post<GoodsReceivedNote>(`/goods-received-notes/${id}/cancel`, { reason })
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
      // Approving can complete the purchase order. Stock updates by itself (live stock).
      void queryClient.invalidateQueries({ queryKey: ["goods-received-notes"] })
      void queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      toast.success(`${done} GRN ${note.grnNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not ${failed} GRN: ${error.message}`)
    },
  })
}

export const useCreateGoodsReceivedNote = () => useGoodsReceivedNoteMutation(createGoodsReceivedNote, "Created", "create")
export const useUpdateGoodsReceivedNote = () => useGoodsReceivedNoteMutation(updateGoodsReceivedNote, "Saved", "save")
export const useApproveGoodsReceivedNote = () => useGoodsReceivedNoteMutation(approveGoodsReceivedNote, "Approved", "approve")
export const useRejectGoodsReceivedNote = () => useGoodsReceivedNoteMutation(rejectGoodsReceivedNote, "Rejected", "reject")
export const useCancelGoodsReceivedNote = () => useGoodsReceivedNoteMutation(cancelGoodsReceivedNote, "Cancelled", "cancel")
