import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { mergeRows } from "@/app/liveList"
import { fetchAll, http } from "@/lib/http"

import type { DeliveryNote, DeliveryNoteSummary, DropdownUser } from "./types"

// Every note, so the grid can search, sort and page them in the browser.
export function fetchDeliveryNotes(): Promise<DeliveryNoteSummary[]> {
  return fetchAll<DeliveryNoteSummary>("/delivery-notes")
}

export async function fetchDeliveryNote(id: string): Promise<DeliveryNote> {
  const { data } = await http.get<DeliveryNote>(`/delivery-notes/${id}`)
  return data
}

export async function setItemVerifier({ id, userId }: { id: number; userId: string }): Promise<DeliveryNote> {
  const { data } = await http.post<DeliveryNote>(`/delivery-notes/${id}/verifier`, { userId })
  return data
}

export async function setItemIssuer({ id, userId }: { id: number; userId: string }): Promise<DeliveryNote> {
  const { data } = await http.post<DeliveryNote>(`/delivery-notes/${id}/issuer`, { userId })
  return data
}

export async function fetchItemVerifiers(): Promise<DropdownUser[]> {
  const { data } = await http.get<DropdownUser[]>("/delivery-notes/item-verifiers")
  return data
}

export async function fetchItemIssuers(): Promise<DropdownUser[]> {
  const { data } = await http.get<DropdownUser[]>("/delivery-notes/item-issuers")
  return data
}

// The newest 100, to catch up on changes the live stream may have missed (./live.ts).
export async function fetchRecentDeliveryNotes(): Promise<DeliveryNoteSummary[]> {
  const { data } = await http.get<{ data: DeliveryNoteSummary[] }>("/delivery-notes", { params: { page: 1, limit: 100 } })
  return data.data
}

// The rows of the delivery notes a live event named (at most 100). Not cached by the server, so never older than the event.
export async function fetchDeliveryNotesByIds(ids: number[]): Promise<DeliveryNoteSummary[]> {
  const { data } = await http.get<DeliveryNoteSummary[]>("/delivery-notes/by-ids", { params: { ids: ids.join(",") } })
  return data
}

// Every delivery note, loaded once per session and then kept up to date by the live stream (./live.ts), so it never
// goes stale. The newest are read again at the end, so a change made while the pages loaded isn't lost.
export function useDeliveryNotes() {
  return useQuery({
    queryKey: ["delivery-notes", "list"],
    queryFn: async () => mergeRows(await fetchDeliveryNotes(), await fetchRecentDeliveryNotes()),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export function useDeliveryNote(id: string) {
  return useQuery({ queryKey: ["delivery-notes", "detail", id], queryFn: () => fetchDeliveryNote(id) })
}

// The invoice page shows its note's status, so it's refreshed too.
export function useSetItemVerifier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: setItemVerifier,
    onSuccess: (note) => {
      queryClient.setQueryData<DeliveryNoteSummary[]>(["delivery-notes", "list"], (list) => list && mergeRows(list, [note]))
      void queryClient.invalidateQueries({ queryKey: ["delivery-notes", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["invoices", "detail"] })
      toast.success(`Saved the item verifier on delivery note ${note.deliveryNoteNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not save the item verifier: ${error.message}`)
    },
  })
}

export function useSetItemIssuer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: setItemIssuer,
    onSuccess: (note) => {
      queryClient.setQueryData<DeliveryNoteSummary[]>(["delivery-notes", "list"], (list) => list && mergeRows(list, [note]))
      void queryClient.invalidateQueries({ queryKey: ["delivery-notes", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["invoices", "detail"] })
      toast.success(`Saved the item issuer on delivery note ${note.deliveryNoteNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not save the item issuer: ${error.message}`)
    },
  })
}

// Only loaded when the dialog that needs them opens.
export function useItemVerifiers(enabled: boolean) {
  return useQuery({ queryKey: ["delivery-notes", "item-verifiers"], queryFn: fetchItemVerifiers, enabled, staleTime: 30 * 60_000, gcTime: 60 * 60_000 })
}

export function useItemIssuers(enabled: boolean) {
  return useQuery({ queryKey: ["delivery-notes", "item-issuers"], queryFn: fetchItemIssuers, enabled, staleTime: 30 * 60_000, gcTime: 60 * 60_000 })
}
