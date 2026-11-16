import type { QueryClient } from "@tanstack/react-query"
import type { LiveHandler } from "@/app/liveEvents"
import { fetchInvoicesByIds, fetchRecentInvoices, mergeInvoices } from "./api"
import type { InvoiceSummary } from "./types"

// Live invoices. The list (["invoices", "list"], every invoice) is loaded once per session; after that, `invoice` events
// on the app's live stream (app/liveEvents.ts) name the invoices that changed, and only those rows are reloaded and
// merged in. While no page has loaded the list, nothing is fetched. On (re)open and "resync" the newest 100 are
// reloaded: an older invoice changed while the stream was down shows after the next page reload.

// Changes are fetched in batches, so finalizing many invoices at once sends one request per 100, not one per invoice.
const BATCH_MS = 250
const RETRY_MS = 5_000
// What GET /invoices/by-ids takes at a time.
const MAX_IDS = 100

const LIST_KEY = ["invoices", "list"]

export function liveInvoices(queryClient: QueryClient): LiveHandler {
  let changed = new Set<number>()
  let batchTimer: ReturnType<typeof setTimeout> | undefined

  const isLoaded = () => queryClient.getQueryData(LIST_KEY) !== undefined
  const merge = (rows: InvoiceSummary[]) =>
    queryClient.setQueryData<InvoiceSummary[]>(LIST_KEY, (list) => list && mergeInvoices(list, rows))

  const applyBatch = async () => {
    batchTimer = undefined
    const ids = [...changed]
    changed = new Set()
    // An open invoice, or a quotation's invoices, show the change too.
    for (const id of ids) void queryClient.invalidateQueries({ queryKey: ["invoices", "detail", String(id)] })
    void queryClient.invalidateQueries({ queryKey: ["invoices", "quotation"] })
    if (!isLoaded()) return
    try {
      for (let start = 0; start < ids.length; start += MAX_IDS) merge(await fetchInvoicesByIds(ids.slice(start, start + MAX_IDS)))
    } catch {
      // Server unreachable: try these again after a pause.
      for (const id of ids) changed.add(id)
      batchTimer ??= setTimeout(() => void applyBatch(), RETRY_MS)
    }
  }

  return {
    events: {
      invoice: (data) => {
        changed.add((JSON.parse(data) as { id: number }).id)
        batchTimer ??= setTimeout(() => void applyBatch(), BATCH_MS)
      },
    },
    reload: async () => {
      if (isLoaded()) merge(await fetchRecentInvoices())
    },
    stop: () => clearTimeout(batchTimer),
  }
}
