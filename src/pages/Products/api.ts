import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { http, mockDelay, USE_MOCK } from "@/lib/http"

import type { CreatedProduct, NewProduct, Product, ProductPage } from "./types"

// The API caps `limit` below 1000, so the full list is read in pages of this size.
const PAGE_LIMIT = 500

async function fetchProductPage(page: number): Promise<ProductPage> {
  const { data } = await http.get<ProductPage>("/products", { params: { page, limit: PAGE_LIMIT } })
  return data
}

// Loads every product so the grid can search, sort and page across all of them in the browser.
export async function fetchProducts(): Promise<Product[]> {
  const first = await fetchProductPage(1)
  const rest = await Promise.all(
    Array.from({ length: Math.max(first.totalPages - 1, 0) }, (_, index) => fetchProductPage(index + 2)),
  )
  return [first, ...rest].flatMap((page) => page.data)
}

export async function fetchProduct(id: string): Promise<Product> {
  const { data } = await http.get<Product>(`/products/${id}`)
  return data
}

const mockProducts: CreatedProduct[] = []

export async function createProduct(newProduct: NewProduct): Promise<CreatedProduct> {
  if (USE_MOCK) {
    await mockDelay()
    const product: CreatedProduct = { ...newProduct, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    mockProducts.unshift(product)
    return product
  }
  const { data } = await http.post<CreatedProduct>("/products", newProduct)
  return data
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
      toast.success(`Created "${product.name}"`)
    },
    onError: (error) => {
      toast.error(`Could not create product: ${error.message}`)
    },
  })
}
