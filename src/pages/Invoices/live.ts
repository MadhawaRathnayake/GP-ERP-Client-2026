import { liveList } from "@/app/liveList"
import { fetchInvoicesByIds, fetchRecentInvoices } from "./api"
import type { InvoiceSummary } from "./types"

// The invoices list, kept live by `invoice` events (app/liveList.ts).
export const liveInvoices = liveList<InvoiceSummary>({
  key: "invoices",
  event: "invoice",
  fetchByIds: fetchInvoicesByIds,
  fetchRecent: fetchRecentInvoices,
  // A quotation's invoices.
  alsoRefresh: [["invoices", "quotation"]],
})
