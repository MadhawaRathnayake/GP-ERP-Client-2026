import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { fetchAll, http } from "@/lib/http"

import type { NewSupplier, Supplier, SupplierUpdate } from "./types"

export const fetchSuppliers = () => fetchAll<Supplier>("/suppliers")

export function useSuppliers() {
  return useQuery({ queryKey: ["suppliers"], queryFn: fetchSuppliers })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: NewSupplier) => (await http.post<Supplier>("/suppliers", body)).data,
    onSuccess: (supplier) => {
      void queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      toast.success(`Created supplier "${supplier.name}"`)
    },
    onError: (error) => toast.error(`Could not create supplier: ${error.message}`),
  })
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: ["suppliers", "detail", id],
    queryFn: async () => (await http.get<Supplier>(`/suppliers/${id}`)).data,
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...changes }: SupplierUpdate) => (await http.patch<Supplier>(`/suppliers/${id}`, changes)).data,
    onSuccess: (supplier) => {
      void queryClient.invalidateQueries({ queryKey: ["suppliers"] })
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      toast.success("Deleted the supplier")
    },
    onError: (error) => toast.error(`Could not delete supplier: ${error.message}`),
  })
}
