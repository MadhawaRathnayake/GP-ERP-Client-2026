import { liveList } from "@/app/liveList"
import { fetchProductsByIds } from "./api"
import type { Product } from "./types"

// The products list, kept live by `product` events (app/liveList.ts). Stock comes through live stock (app/liveStock.ts).
export const liveProducts = liveList<Product>({
  key: "products",
  event: "product",
  fetchByIds: fetchProductsByIds,
})
