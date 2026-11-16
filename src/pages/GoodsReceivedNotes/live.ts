import { liveList } from "@/app/liveList"
import { fetchGoodsReceivedNotesByIds, fetchRecentGoodsReceivedNotes } from "./api"
import type { GoodsReceivedNoteSummary } from "./types"

// The goods-received-notes list, kept live by `goodsReceivedNote` events (app/liveList.ts).
export const liveGoodsReceivedNotes = liveList<GoodsReceivedNoteSummary>({
  key: "goods-received-notes",
  event: "goodsReceivedNote",
  fetchByIds: fetchGoodsReceivedNotesByIds,
  fetchRecent: fetchRecentGoodsReceivedNotes,
  // The IR and PO pages show their order's receipt.
  alsoRefresh: [["goods-received-notes", "order"]],
})
