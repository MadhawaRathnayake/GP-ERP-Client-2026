import { liveList } from "@/app/liveList"
import { fetchSuppliersByIds } from "./api"
import type { Supplier } from "./types"

// The suppliers list, kept live by `supplier` events (app/liveList.ts).
export const liveSuppliers = liveList<Supplier>({
  key: "suppliers",
  event: "supplier",
  fetchByIds: fetchSuppliersByIds,
})
