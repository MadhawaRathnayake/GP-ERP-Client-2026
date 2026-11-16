import { liveList } from "@/app/liveList"
import { fetchPurchaseOrdersByIds, fetchRecentPurchaseOrders } from "./api"
import type { PurchaseOrderSummary } from "./types"

// The purchase-orders list, kept live by `purchaseOrder` events (app/liveList.ts).
export const livePurchaseOrders = liveList<PurchaseOrderSummary>({
  key: "purchase-orders",
  event: "purchaseOrder",
  fetchByIds: fetchPurchaseOrdersByIds,
  fetchRecent: fetchRecentPurchaseOrders,
  // The IR page shows its purchase order's status.
  alsoRefresh: [["internal-requisitions", "detail"]],
})
