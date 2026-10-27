import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { createProduct, fetchProduct, fetchProducts } from "@/api/client"

export function useProducts(q?: string) {
  return useQuery({
    queryKey: ["products", "list", q ?? ""],
    queryFn: () => fetchProducts(q),
    placeholderData: keepPreviousData,
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["products", "detail", id],
    queryFn: () => fetchProduct(id),
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createProduct,
    onSuccess: (product) => {
      void queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success(`Created "${product.name}"`)
    },
    onError: (error) => {
      toast.error(`Could not create product: ${error.message}`)
    },
  })
}
