import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { fetchAll, http } from "@/lib/http"

import type { NewProduct, Product, ProductUpdate } from "./types"

// Every product, so the grid can search, sort and page across all of them in the browser.
export function fetchProducts(): Promise<Product[]> {
  return fetchAll<Product>("/products")
}

export async function fetchProduct(id: string): Promise<Product> {
  const { data } = await http.get<Product>(`/products/${id}`)
  return data
}

export async function createProduct(newProduct: NewProduct): Promise<Product> {
  const { data } = await http.post<Product>("/products", newProduct)
  return data
}

export async function updateProduct({ id, ...changes }: ProductUpdate): Promise<Product> {
  const { data } = await http.patch<Product>(`/products/${id}`, changes)
  return data
}

export async function deleteProduct(id: string): Promise<void> {
  await http.delete(`/products/${id}`)
}

export function useProducts() {
  // The full list is several requests, so keep it for a few minutes instead of refetching on every visit.
  return useQuery({ queryKey: ["products", "list"], queryFn: fetchProducts, staleTime: 5 * 60_000 })
}

export function useProduct(id: string) {
  return useQuery({ queryKey: ["products", "detail", id], queryFn: () => fetchProduct(id) })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createProduct,
    onSuccess: (product) => {
      void queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success(`Created ${product.sku}`)
    },
    onError: (error) => {
      toast.error(`Could not create product: ${error.message}`)
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateProduct,
    onSuccess: (product) => {
      void queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success(`Saved ${product.sku}`)
    },
    onError: (error) => {
      toast.error(`Could not save product: ${error.message}`)
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ["products", "detail", id] })
      void queryClient.invalidateQueries({ queryKey: ["products", "list"] })
      toast.success("Deleted the product")
    },
    onError: (error) => {
      toast.error(`Could not delete product: ${error.message}`)
    },
  })
}
