import { liveList } from "@/app/liveList"
import { fetchDeliveryNotesByIds, fetchRecentDeliveryNotes } from "./api"
import type { DeliveryNoteSummary } from "./types"

// The delivery-notes list, kept live by `deliveryNote` events (app/liveList.ts).
export const liveDeliveryNotes = liveList<DeliveryNoteSummary>({
  key: "delivery-notes",
  event: "deliveryNote",
  fetchByIds: fetchDeliveryNotesByIds,
  fetchRecent: fetchRecentDeliveryNotes,
})
