import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { http } from "@/lib/http"

import type { Accessory, AccessoryUpdate, NewAccessory, ProductAccessory } from "./types"

// Not paginated. Includes deleted ones, so they can be restored and old serials still show their name.
export async function fetchAccessories(): Promise<Accessory[]> {
  const { data } = await http.get<Accessory[]>("/accessories", { params: { includeDeleted: true } })
  return data
}

export async function createAccessory(newAccessory: NewAccessory): Promise<Accessory> {
  const { data } = await http.post<Accessory>("/accessories", newAccessory)
  return data
}

export async function updateAccessory({ id, ...changes }: AccessoryUpdate): Promise<Accessory> {
  const { data } = await http.patch<Accessory>(`/accessories/${id}`, changes)
  return data
}

// Soft delete; the server refuses (409) while a product comes with it.
export async function deleteAccessory(id: string): Promise<void> {
  await http.delete(`/accessories/${id}`)
}

export async function fetchProductAccessories(productId: string): Promise<ProductAccessory[]> {
  const { data } = await http.get<ProductAccessory[]>(`/products/${productId}/accessories`)
  return data
}

// Replaces the product's whole list.
export async function setProductAccessories({
  productId,
  items,
}: {
  productId: string
  items: { accessoryId: string; quantity: number }[]
}): Promise<ProductAccessory[]> {
  const { data } = await http.put<ProductAccessory[]>(`/products/${productId}/accessories`, { items })
  return data
}

export function useAccessories(enabled = true) {
  return useQuery({ queryKey: ["accessories"], queryFn: fetchAccessories, staleTime: 5 * 60_000, enabled })
}

export function useProductAccessories(productId: string, enabled = true) {
  return useQuery({
    queryKey: ["products", "accessories", productId],
    queryFn: () => fetchProductAccessories(productId),
    enabled,
  })
}

export function useCreateAccessory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createAccessory,
    onSuccess: (accessory) => {
      void queryClient.invalidateQueries({ queryKey: ["accessories"] })
      toast.success(`Created accessory "${accessory.name}"`)
    },
    onError: (error) => {
      toast.error(`Could not create accessory: ${error.message}`)
    },
  })
}

export function useUpdateAccessory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateAccessory,
    onSuccess: (accessory) => {
      void queryClient.invalidateQueries({ queryKey: ["accessories"] })
      toast.success(`Saved accessory "${accessory.name}"`)
    },
    onError: (error) => {
      toast.error(`Could not save accessory: ${error.message}`)
    },
  })
}

export function useDeleteAccessory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteAccessory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["accessories"] })
      toast.success("Deleted the accessory")
    },
    onError: (error) => {
      toast.error(`Could not delete accessory: ${error.message}`)
    },
  })
}

export function useSetProductAccessories() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: setProductAccessories,
    onSuccess: (_, { productId }) => {
      void queryClient.invalidateQueries({ queryKey: ["products", "accessories", productId] })
      toast.success("Saved what comes with the product")
    },
    onError: (error) => {
      toast.error(`Could not save accessories: ${error.message}`)
    },
  })
}
