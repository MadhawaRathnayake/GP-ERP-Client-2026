import type { QueryClient, QueryKey } from "@tanstack/react-query"
import type { LiveHandler } from "@/app/liveEvents"
import { ApiError } from "@/lib/http"

// A document list kept live: the whole list ([key, "list"]) is loaded once per session, and after that the app's live
// stream (app/liveEvents.ts) names the documents that changed, so only those rows are reloaded and merged in. While no
// page has loaded the list, nothing is fetched. On (re)open and "resync" the newest 100 are reloaded: an older one
// changed while the stream was down shows after the next page reload. A list that isn't ordered newest first (master
// data) has no "newest 100", so it's loaded again instead. Each feature's live.ts sets one up.

// Changes are fetched in batches, so many changes at once send one request per 100, not one each.
const BATCH_MS = 250
const RETRY_MS = 5_000
// What a GET /<feature>/by-ids takes at a time.
const MAX_IDS = 100

export interface LiveRow {
  id: number | string
  isDeleted?: boolean
}

export interface LiveListOptions<T extends LiveRow> {
  // The feature's query keys start with it: the list is [key, "list"], one record [key, "detail", id].
  key: string
  // The stream's event for it, whose data is { id }.
  event: string
  fetchByIds: (ids: T["id"][]) => Promise<T[]>
  // The newest 100. Without it, the whole list is loaded again when the stream (re)opens.
  fetchRecent?: () => Promise<T[]>
  // Other queries that show these documents, refreshed after every batch of changes.
  alsoRefresh?: QueryKey[]
}

export function liveList<T extends LiveRow>({ key, event, fetchByIds, fetchRecent, alsoRefresh = [] }: LiveListOptions<T>) {
  return (queryClient: QueryClient): LiveHandler => {
    const listKey = [key, "list"]
    let changed = new Set<T["id"]>()
    let batchTimer: ReturnType<typeof setTimeout> | undefined

    const isLoaded = () => queryClient.getQueryData(listKey) !== undefined
    const merge = (rows: T[]) => queryClient.setQueryData<T[]>(listKey, (list) => list && mergeRows(list, rows))

    const applyBatch = async () => {
      batchTimer = undefined
      const ids = [...changed]
      changed = new Set()
      // An open record shows the change too.
      for (const id of ids) void queryClient.invalidateQueries({ queryKey: [key, "detail", String(id)] })
      for (const queryKey of alsoRefresh) void queryClient.invalidateQueries({ queryKey })
      if (!isLoaded()) return
      try {
        for (let start = 0; start < ids.length; start += MAX_IDS) merge(await fetchByIds(ids.slice(start, start + MAX_IDS)))
      } catch (error) {
        // The server refused the request (signed out, no access, a bad request): asking again won't change that. A
        // 401 already sends the user to sign in (app/providers.tsx).
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          console.error(`Live ${key}: could not reload changed rows`, error)
          return
        }
        // Server unreachable: try these again after a pause.
        for (const id of ids) changed.add(id)
        batchTimer ??= setTimeout(() => void applyBatch(), RETRY_MS)
      }
    }

    return {
      events: {
        [event]: (data) => {
          changed.add((JSON.parse(data) as { id: T["id"] }).id)
          batchTimer ??= setTimeout(() => void applyBatch(), BATCH_MS)
        },
      },
      reload: async () => {
        if (!isLoaded()) return
        if (fetchRecent) merge(await fetchRecent())
        else await queryClient.invalidateQueries({ queryKey: listKey })
      },
      stop: () => clearTimeout(batchTimer),
    }
  }
}

// The list with these rows put in: a known document is replaced, a new one goes first (newest first, like the server),
// and a deleted one is taken out (lists hold only documents that aren't deleted). The same array when nothing changed,
// so the grid doesn't re-render for nothing.
export function mergeRows<T extends LiveRow>(list: T[], rows: T[]): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]))
  let changed = false
  const merged: T[] = []
  for (const item of list) {
    const row = byId.get(item.id)
    byId.delete(item.id)
    if (!row || JSON.stringify(row) === JSON.stringify(item)) merged.push(item)
    else {
      changed = true
      if (!row.isDeleted) merged.push(row)
    }
  }
  const added = [...byId.values()].filter((row) => !row.isDeleted).sort(newestFirst)
  if (added.length === 0) return changed ? merged : list
  return [...added, ...merged]
}

// Higher ids are newer: numbers, and padded text ids (CUST000012).
function newestFirst(a: LiveRow, b: LiveRow) {
  return typeof a.id === "number" && typeof b.id === "number" ? b.id - a.id : String(b.id).localeCompare(String(a.id))
}
