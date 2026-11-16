import type { QueryClient } from "@tanstack/react-query"
import type { LiveHandler } from "@/app/liveEvents"
import { fetchQuotationsByIds, fetchRecentQuotations, mergeQuotations } from "./api"
import type { QuotationSummary } from "./types"

// Live quotations. The list (["quotations", "list"], every quotation that isn't deleted) is loaded once per session;
// after that, `quotation` events on the app's live stream (app/liveEvents.ts) name the quotations that changed (also
// by an invoice, which changes its quotation's status), and only those rows are reloaded and merged in; deleted ones
// are taken out. While no page has loaded the list, nothing is fetched. On (re)open and "resync" the newest 100 are
// reloaded: an older quotation changed while the stream was down shows after the next page reload.

// Changes are fetched in batches, so many changes at once send one request per 100, not one per quotation.
const BATCH_MS = 250
const RETRY_MS = 5_000
// What GET /quotations/by-ids takes at a time.
const MAX_IDS = 100

const LIST_KEY = ["quotations", "list"]

export function liveQuotations(queryClient: QueryClient): LiveHandler {
  let changed = new Set<number>()
  let batchTimer: ReturnType<typeof setTimeout> | undefined

  const isLoaded = () => queryClient.getQueryData(LIST_KEY) !== undefined
  const merge = (rows: QuotationSummary[]) =>
    queryClient.setQueryData<QuotationSummary[]>(LIST_KEY, (list) => list && mergeQuotations(list, rows))

  const applyBatch = async () => {
    batchTimer = undefined
    const ids = [...changed]
    changed = new Set()
    // An open quotation shows the change too.
    for (const id of ids) void queryClient.invalidateQueries({ queryKey: ["quotations", "detail", String(id)] })
    if (!isLoaded()) return
    try {
      for (let start = 0; start < ids.length; start += MAX_IDS) merge(await fetchQuotationsByIds(ids.slice(start, start + MAX_IDS)))
    } catch {
      // Server unreachable: try these again after a pause.
      for (const id of ids) changed.add(id)
      batchTimer ??= setTimeout(() => void applyBatch(), RETRY_MS)
    }
  }

  return {
    events: {
      quotation: (data) => {
        changed.add((JSON.parse(data) as { id: number }).id)
        batchTimer ??= setTimeout(() => void applyBatch(), BATCH_MS)
      },
    },
    reload: async () => {
      if (isLoaded()) merge(await fetchRecentQuotations())
    },
    stop: () => clearTimeout(batchTimer),
  }
}
