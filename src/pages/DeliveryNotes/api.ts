import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

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

export async function fetchItemVerifiers(): Promise<DropdownUser[]> {
  const { data } = await http.get<DropdownUser[]>("/delivery-notes/item-verifiers")
  return data
}

export async function fetchItemIssuers(): Promise<DropdownUser[]> {
  const { data } = await http.get<DropdownUser[]>("/delivery-notes/item-issuers")
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

export function useDeliveryNotes() {
  return useQuery({ queryKey: ["delivery-notes", "list"], queryFn: fetchDeliveryNotes })
}

export function useDeliveryNote(id: string) {
  return useQuery({ queryKey: ["delivery-notes", "detail", id], queryFn: () => fetchDeliveryNote(id) })
}

// Only loaded when the dialog that needs them opens.
export function useItemVerifiers(enabled: boolean) {
  return useQuery({ queryKey: ["delivery-notes", "item-verifiers"], queryFn: fetchItemVerifiers, enabled, staleTime: 5 * 60_000 })
}

export function useItemIssuers(enabled: boolean) {
  return useQuery({ queryKey: ["delivery-notes", "item-issuers"], queryFn: fetchItemIssuers, enabled, staleTime: 5 * 60_000 })
}

// The invoice page shows its note's status, so it's refreshed too.
function useDeliveryNoteMutation(mutationFn: (variables: { id: number; userId: string }) => Promise<DeliveryNote>, done: string, failed: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (note) => {
      void queryClient.invalidateQueries({ queryKey: ["delivery-notes"] })
      void queryClient.invalidateQueries({ queryKey: ["invoices", "detail"] })
      toast.success(`${done} on delivery note ${note.deliveryNoteNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not ${failed}: ${error.message}`)
    },
  })
}

export const useSetItemVerifier = () => useDeliveryNoteMutation(setItemVerifier, "Saved the item verifier", "save the item verifier")
export const useSetItemIssuer = () => useDeliveryNoteMutation(setItemIssuer, "Saved the item issuer", "save the item issuer")
