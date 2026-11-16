import { liveList } from "@/app/liveList"
import { fetchQuotationsByIds, fetchRecentQuotations } from "./api"
import type { QuotationSummary } from "./types"

// The quotations list, kept live by `quotation` events (app/liveList.ts).
export const liveQuotations = liveList<QuotationSummary>({
  key: "quotations",
  event: "quotation",
  fetchByIds: fetchQuotationsByIds,
  fetchRecent: fetchRecentQuotations,
})
