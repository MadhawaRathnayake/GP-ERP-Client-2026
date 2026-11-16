import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { mergeRows } from "@/app/liveList"
import { fetchAll, http } from "@/lib/http"

import { withLatestStock, withLatestStockList } from "./stock"
import type { NewProduct, Product, ProductUpdate, StockAdjustment, StockLevel } from "./types"

// Every active product, so the grid can search, sort and page across all of them in the browser.
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

// Soft delete: the server sets isDeleted = true. `updateProduct({ id, isDeleted: false })` restores it.
export async function deleteProduct(id: string): Promise<void> {
  await http.delete(`/products/${id}`)
}

export async function adjustStock({ id, ...adjustment }: StockAdjustment): Promise<Product> {
  const { data } = await http.post<Product>(`/products/${id}/stock-adjustments`, adjustment)
  return data
}

// Current stock of every active product; app/liveStock.ts reloads it whenever live updates may have been missed.
// The rows of the products a live event named (at most 100), deleted ones included, with the newest stock heard. Not
// cached by the server, so never older than the event.
export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  const { data } = await http.get<Product[]>("/products/by-ids", { params: { ids: ids.join(",") } })
  return withLatestStockList(data)
}

export async function fetchStockLevels(): Promise<StockLevel[]> {
  const { data } = await http.get<StockLevel[]>("/stock")
  return data
}

// The storage server can't limit the size, so the browser checks it.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

// Gets a signed upload URL, PUTs the file straight to storage, and returns the public URL to save as imageUrl.
export async function uploadProductImage(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) throw new Error("The image must be 5 MB or smaller")
  const { data } = await http.post<{ uploadUrl: string; publicUrl: string }>("/products/image-upload-url", {
    contentType: file.type,
  })
  // Plain fetch: the storage URL is not our API, so no session cookie or API error handling.
  const response = await fetch(data.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file })
  if (!response.ok) throw new Error(`Upload failed (${response.status})`)
  return data.publicUrl
}

// Product responses take the newest stock already heard live (./stock.ts): a response that was on its way while stock
// changed must not bring the old numbers back.

export function useProducts() {
  // Loaded once per session: its stock stays current through live stock (app/liveStock.ts), the rest through live
  // products (./live.ts).
  return useQuery({
    queryKey: ["products", "list"],
    queryFn: async () => withLatestStockList(await fetchProducts()),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export function useProduct(id: string) {
  return useQuery({ queryKey: ["products", "detail", id], queryFn: async () => withLatestStock(await fetchProduct(id)) })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createProduct,
    onSuccess: (product) => {
      queryClient.setQueryData<Product[]>(["products", "list"], (list) => list && mergeRows(list, [withLatestStock(product)]))
      void queryClient.invalidateQueries({ queryKey: ["products", "detail"] })
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
      queryClient.setQueryData<Product[]>(["products", "list"], (list) => list && mergeRows(list, [withLatestStock(product)]))
      void queryClient.invalidateQueries({ queryKey: ["products", "detail"] })
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
      queryClient.setQueryData<Product[]>(["products", "list"], (list) => list?.filter((product) => product.id !== id))
      void queryClient.invalidateQueries({ queryKey: ["products", "detail"] })
      toast.success("Deleted the product")
    },
    onError: (error) => {
      toast.error(`Could not delete product: ${error.message}`)
    },
  })
}

export function useAdjustStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adjustStock,
    onSuccess: (product) => {
      queryClient.setQueryData<Product[]>(["products", "list"], (list) => list && mergeRows(list, [withLatestStock(product)]))
      void queryClient.invalidateQueries({ queryKey: ["products", "detail"] })
      void queryClient.invalidateQueries({ queryKey: ["serial-items"] })
      toast.success(`${product.sku}: ${product.stockInHand} in stock`)
    },
    onError: (error) => {
      toast.error(`Could not adjust stock: ${error.message}`)
    },
  })
}

export function useUploadProductImage() {
  return useMutation({
    mutationFn: uploadProductImage,
    onError: (error) => {
      toast.error(`Could not upload image: ${error.message}`)
    },
  })
}
