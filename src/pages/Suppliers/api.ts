import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { mergeRows } from "@/app/liveList"
import { fetchAll, http } from "@/lib/http"
import type { NewSupplier, Supplier, SupplierUpdate } from "./types"

export const fetchSuppliers = () => fetchAll<Supplier>("/suppliers")

// The rows of the suppliers a live event named (at most 100), deleted ones included. Not cached by the server, so
// never older than the event.
export async function fetchSuppliersByIds(ids: string[]): Promise<Supplier[]> {
  const { data } = await http.get<Supplier[]>("/suppliers/by-ids", { params: { ids: ids.join(",") } })
  return data
}

// Every supplier that isn't deleted, loaded once per session and then kept up to date by the live stream (./live.ts),
// so it never goes stale.
export function useSuppliers() {
  return useQuery({ queryKey: ["suppliers", "list"], queryFn: fetchSuppliers, staleTime: Infinity, gcTime: Infinity })
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: ["suppliers", "detail", id],
    queryFn: async () => (await http.get<Supplier>(`/suppliers/${id}`)).data,
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: NewSupplier) => (await http.post<Supplier>("/suppliers", body)).data,
    onSuccess: (supplier) => {
      queryClient.setQueryData<Supplier[]>(["suppliers", "list"], (list) => list && mergeRows(list, [supplier]))
      void queryClient.invalidateQueries({ queryKey: ["suppliers", "detail"] })
      toast.success(`Created supplier "${supplier.name}"`)
    },
    onError: (error) => toast.error(`Could not create supplier: ${error.message}`),
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...changes }: SupplierUpdate) => (await http.patch<Supplier>(`/suppliers/${id}`, changes)).data,
    onSuccess: (supplier) => {
      queryClient.setQueryData<Supplier[]>(["suppliers", "list"], (list) => list && mergeRows(list, [supplier]))
      void queryClient.invalidateQueries({ queryKey: ["suppliers", "detail"] })
      toast.success(`Saved supplier "${supplier.name}"`)
    },
    onError: (error) => toast.error(`Could not save supplier: ${error.message}`),
  })
}

// Soft delete: the server sets isDeleted = true. `useUpdateSupplier` with { isDeleted: false } restores it.
export function useDeleteSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await http.delete(`/suppliers/${id}`)
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData<Supplier[]>(["suppliers", "list"], (list) => list?.filter((supplier) => supplier.id !== id))
      void queryClient.invalidateQueries({ queryKey: ["suppliers", "detail"] })
      toast.success("Deleted the supplier")
    },
    onError: (error) => toast.error(`Could not delete supplier: ${error.message}`),
  })
}
