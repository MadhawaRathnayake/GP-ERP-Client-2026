import type { QueryClient } from "@tanstack/react-query"

import type { Product, StockLevel } from "./types"

// Live stock: the newest stock heard of per product, from GET /stock and the stream in app/liveStock.ts. It's applied
// to every cached product and to every product response as it lands, so stock never goes backwards: of two values the
// one with the higher stockVersion wins, whatever order responses and events arrive in.
// Product lists are cached under ["products", "list", …] and single products under ["products", "detail", id].
const latest = new Map<string, StockLevel>()

// The product with the newest stock known for it.
export function withLatestStock(product: Product): Product {
  const level = latest.get(product.id)
  if (!level || level.stockVersion <= product.stockVersion) return product
  return {
    ...product,
    stockInHand: level.stockInHand,
    stockPreOrder: level.stockPreOrder,
    stockInTransit: level.stockInTransit,
    stockOnArrival: level.stockOnArrival,
    stockVersion: level.stockVersion,
  }
}

// The same array when nothing changed, so pages don't re-render for nothing.
export function withLatestStockList(products: Product[]): Product[] {
  let changed = false
  const next = products.map((product) => {
    const updated = withLatestStock(product)
    if (updated !== product) changed = true
    return updated
  })
  return changed ? next : products
}

// Remembers the levels that are newer than what's known, and updates every cached product with them.
export function receiveStockLevels(queryClient: QueryClient, levels: StockLevel[]) {
  let changed = false
  for (const level of levels) {
    const known = latest.get(level.id)
    if (known && known.stockVersion >= level.stockVersion) continue
    latest.set(level.id, level)
    changed = true
  }
  if (!changed) return
  queryClient.setQueriesData<Product[]>({ queryKey: ["products", "list"] }, (list) => list && withLatestStockList(list))
  queryClient.setQueriesData<Product>({ queryKey: ["products", "detail"] }, (product) => product && withLatestStock(product))
}

// Forgets everything heard, e.g. when the stream stops (sign-out). Fresh responses carry their own stock.
export function forgetStockLevels() {
  latest.clear()
}
