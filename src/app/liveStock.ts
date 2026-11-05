import { useQueryClient, type QueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useCan } from "@/app/auth"
import { apiUrl } from "@/lib/http"
import { fetchStockLevels } from "@/pages/Products/api"
import { forgetStockLevels, receiveStockLevels } from "@/pages/Products/stock"
import type { StockLevel } from "@/pages/Products/types"

// Keeps stock live on every page: one server-sent events stream (GET /stock/events) for the whole app, whose changes
// update every cached product (pages/Products/stock.ts).
// The stream doesn't promise every change: the server misses some while it reconnects to the database, and the browser
// misses all while it's disconnected. So the full snapshot (GET /stock) is loaded whenever the stream (re)opens or the
// server sends "resync". Stock versions make the order of snapshots and changes irrelevant.

// Changes are applied in batches, so a goods receipt with hundreds of lines doesn't re-render hundreds of times.
const BATCH_MS = 250
const FIRST_RETRY_MS = 1_000
const MAX_RETRY_MS = 30_000

// Called after each batch of live stock changes, e.g. for the top bar's spinner.
const stockChangeListeners = new Set<() => void>()

// True for `showMs` after each live stock change, so a page can show that stock just updated.
export function useStockChanged(showMs = 1500) {
  const [changed, setChanged] = useState(false)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const onChange = () => {
      setChanged(true)
      clearTimeout(timer)
      timer = setTimeout(() => setChanged(false), showMs)
    }
    stockChangeListeners.add(onChange)
    return () => {
      stockChangeListeners.delete(onChange)
      clearTimeout(timer)
    }
  }, [showMs])
  return changed
}

// Used once, in AppLayout. Only for users who can see products.
export function useLiveStock() {
  const queryClient = useQueryClient()
  const enabled = useCan()("PRODUCTS.VIEW")
  useEffect(() => {
    if (!enabled) return
    return connectLiveStock(queryClient)
  }, [enabled, queryClient])
}

// Opens the stream and keeps it open until the returned function is called.
function connectLiveStock(queryClient: QueryClient): () => void {
  let source: EventSource | undefined
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let batchTimer: ReturnType<typeof setTimeout> | undefined
  let retryMs = FIRST_RETRY_MS
  let batch: StockLevel[] = []
  let stopped = false

  const applyBatch = () => {
    batchTimer = undefined
    const levels = batch
    batch = []
    receiveStockLevels(queryClient, levels)
    for (const listener of stockChangeListeners) listener()
  }

  const loadSnapshot = async () => {
    try {
      receiveStockLevels(queryClient, await fetchStockLevels())
    } catch {
      // Without the snapshot, changes may be missing: start over after a pause, which loads it again.
      reconnectLater()
    }
  }

  const open = () => {
    const next = new EventSource(apiUrl("/stock/events"), { withCredentials: true })
    next.addEventListener("open", () => {
      retryMs = FIRST_RETRY_MS
      void loadSnapshot()
    })
    next.addEventListener("resync", () => void loadSnapshot())
    next.addEventListener("stock", (event: MessageEvent<string>) => {
      batch.push(JSON.parse(event.data) as StockLevel)
      batchTimer ??= setTimeout(applyBatch, BATCH_MS)
    })
    next.addEventListener("error", () => {
      // While CONNECTING the browser reconnects by itself. CLOSED means it gave up: the server refused the stream
      // (signed out, no permission) or couldn't be reached.
      if (next.readyState !== EventSource.CLOSED) return
      // A 401 there sends the user to sign in (AppLayout); a 403 reloads permissions, which may stop this hook.
      void queryClient.invalidateQueries({ queryKey: ["me"] })
      reconnectLater()
    })
    source = next
  }

  const reconnectLater = () => {
    source?.close()
    source = undefined
    if (stopped || retryTimer) return
    retryTimer = setTimeout(() => {
      retryTimer = undefined
      if (!stopped) open()
    }, retryMs)
    retryMs = Math.min(retryMs * 2, MAX_RETRY_MS)
  }

  open()
  return () => {
    stopped = true
    source?.close()
    clearTimeout(retryTimer)
    clearTimeout(batchTimer)
    forgetStockLevels()
  }
}
