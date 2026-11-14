import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { http } from "@/lib/http"

import type {
  SerialItem,
  SerialItemPage,
  SerialItemStatus,
  SerialItemUpdate,
  SerialNumberCheck,
  StockCheckRow,
} from "./types"

export interface SerialItemFilter {
  search?: string
  productId?: string
  status?: SerialItemStatus
  limit?: number
}

// Searched on the server: there can be far too many units to load them all.
export async function fetchSerialItems({ search, productId, status, limit = 50 }: SerialItemFilter): Promise<SerialItemPage> {
  const { data } = await http.get<SerialItemPage>("/serial-items", {
    params: { search: search || undefined, productId, status, limit, page: 1 },
  })
  return data
}

export async function fetchSerialItem(id: number): Promise<SerialItem> {
  const { data } = await http.get<SerialItem>(`/serial-items/${id}`)
  return data
}

// Whether serials are new, repeated in the list, or already used; only reads.
export async function checkSerialNumbers(serialNumbers: string[]): Promise<SerialNumberCheck[]> {
  const { data } = await http.post<SerialNumberCheck[]>("/serial-items/check", { serialNumbers })
  return data
}

export async function fetchStockCheck(): Promise<StockCheckRow[]> {
  const { data } = await http.get<StockCheckRow[]>("/serial-items/stock-check")
  return data
}

export async function updateSerialItem({ id, ...changes }: SerialItemUpdate): Promise<SerialItem> {
  const { data } = await http.patch<SerialItem>(`/serial-items/${id}`, changes)
  return data
}

export function useSerialItems(filter: SerialItemFilter, enabled = true) {
  return useQuery({
    queryKey: ["serial-items", "list", filter],
    queryFn: () => fetchSerialItems(filter),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useSerialItem(id: number) {
  return useQuery({ queryKey: ["serial-items", "detail", id], queryFn: () => fetchSerialItem(id) })
}

export function useStockCheck(enabled = true) {
  return useQuery({ queryKey: ["serial-items", "stock-check"], queryFn: fetchStockCheck, enabled })
}

export function useUpdateSerialItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateSerialItem,
    onSuccess: (item) => {
      void queryClient.invalidateQueries({ queryKey: ["serial-items"] })
      toast.success(`Saved ${item.serialNumber}`)
    },
    onError: (error) => {
      toast.error(`Could not save the unit: ${error.message}`)
    },
  })
}
