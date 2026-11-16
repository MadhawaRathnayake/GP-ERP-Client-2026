import type { QueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import type { LiveHandler } from "@/app/liveEvents"
import { fetchStockLevels } from "@/pages/Products/api"
import { forgetStockLevels, receiveStockLevels } from "@/pages/Products/stock"
import type { StockLevel } from "@/pages/Products/types"

// Keeps stock live on every page: `stock` events on the app's live stream (app/liveEvents.ts) update every cached
// product (pages/Products/stock.ts). The full snapshot (GET /stock) is loaded whenever the stream (re)opens or the
// server sends "resync". Stock versions make the order of snapshots and changes irrelevant.

// Changes are applied in batches, so a goods receipt with hundreds of lines doesn't re-render hundreds of times.
const BATCH_MS = 250

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

// The stock part of the live stream, for users who can see products.
export function liveStock(queryClient: QueryClient): LiveHandler {
  let batchTimer: ReturnType<typeof setTimeout> | undefined
  let batch: StockLevel[] = []

  const applyBatch = () => {
    batchTimer = undefined
    const levels = batch
    batch = []
    receiveStockLevels(queryClient, levels)
    for (const listener of stockChangeListeners) listener()
  }

  return {
    events: {
      stock: (data) => {
        batch.push(JSON.parse(data) as StockLevel)
        batchTimer ??= setTimeout(applyBatch, BATCH_MS)
      },
    },
    reload: async () => receiveStockLevels(queryClient, await fetchStockLevels()),
    stop: () => {
      clearTimeout(batchTimer)
      forgetStockLevels()
    },
  }
}
