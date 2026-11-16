import { useQueryClient, type QueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { useCan } from "@/app/auth"
import { liveStock } from "@/app/liveStock"
import { apiUrl } from "@/lib/http"
import { liveInvoices } from "@/pages/Invoices/live"
import { liveDeliveryNotes } from "@/pages/DeliveryNotes/live"
import { liveInternalRequisitions } from "@/pages/InternalRequisitions/live"
import { livePurchaseOrders } from "@/pages/PurchaseOrders/live"
import { liveGoodsReceivedNotes } from "@/pages/GoodsReceivedNotes/live"
import { liveCustomers } from "@/pages/Customers/live"
import { liveProducts } from "@/pages/Products/live"
import { liveQuotations } from "@/pages/Quotations/live"
import { liveSuppliers } from "@/pages/Suppliers/live"

// The app's one live stream (GET /events, server-sent events): the server pushes what changed, each event only to users
// allowed to see it. One connection for the whole app, since browsers allow only about six per site.
// The stream doesn't promise every change: the server misses some while it reconnects to the database, and the browser
// misses all while it's disconnected. So each part reloads what it keeps live whenever the stream (re)opens or the
// server sends "resync".

const FIRST_RETRY_MS = 1_000
const MAX_RETRY_MS = 30_000

// One thing kept live: its events (each gets the event's JSON text), what to reload when the stream (re)opens, cleanup.
export interface LiveHandler {
  events: Record<string, (data: string) => void>
  reload(): Promise<void>
  stop(): void
}

// Used once, in AppLayout. Each part only for users who can see it; the server checks it again for every event.
export function useLiveEvents() {
  const queryClient = useQueryClient()
  const can = useCan()
  const stock = can("PRODUCTS.VIEW")
  const invoices = can("INVOICES.VIEW")
  const quotations = can("QUOTATIONS.VIEW")
  const deliveryNotes = can("DELIVERY_NOTES.VIEW")
  const internalRequisitions = can("INTERNAL_REQUISITIONS.VIEW")
  const purchaseOrders = can("PURCHASE_ORDERS.VIEW")
  const goodsReceivedNotes = can("GOODS_RECEIVED_NOTES.VIEW")
  const customers = can("CUSTOMERS.VIEW")
  const suppliers = can("SUPPLIERS.VIEW")
  useEffect(() => {
    const handlers = [
      ...(stock ? [liveStock(queryClient), liveProducts(queryClient)] : []),
      ...(customers ? [liveCustomers(queryClient)] : []),
      ...(suppliers ? [liveSuppliers(queryClient)] : []),
      ...(invoices ? [liveInvoices(queryClient)] : []),
      ...(quotations ? [liveQuotations(queryClient)] : []),
      ...(deliveryNotes ? [liveDeliveryNotes(queryClient)] : []),
      ...(internalRequisitions ? [liveInternalRequisitions(queryClient)] : []),
      ...(purchaseOrders ? [livePurchaseOrders(queryClient)] : []),
      ...(goodsReceivedNotes ? [liveGoodsReceivedNotes(queryClient)] : []),
    ]
    if (handlers.length === 0) return
    return connect(queryClient, handlers)
  }, [queryClient, stock, invoices, quotations, deliveryNotes, internalRequisitions, purchaseOrders, goodsReceivedNotes, customers, suppliers])
}

// Opens the stream and keeps it open until the returned function is called.
function connect(queryClient: QueryClient, handlers: LiveHandler[]): () => void {
  let source: EventSource | undefined
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let retryMs = FIRST_RETRY_MS
  let stopped = false

  const reload = async () => {
    try {
      await Promise.all(handlers.map((handler) => handler.reload()))
    } catch {
      // Without the reload, changes may be missing: start over after a pause, which reloads again.
      reconnectLater()
    }
  }

  const open = () => {
    const next = new EventSource(apiUrl("/events"), { withCredentials: true })
    next.addEventListener("open", () => {
      retryMs = FIRST_RETRY_MS
      void reload()
    })
    next.addEventListener("resync", () => void reload())
    for (const handler of handlers) {
      for (const [name, onEvent] of Object.entries(handler.events)) {
        next.addEventListener(name, (event: MessageEvent<string>) => onEvent(event.data))
      }
    }
    next.addEventListener("error", () => {
      // While CONNECTING the browser reconnects by itself. CLOSED means it gave up: the server refused the stream
      // (signed out) or couldn't be reached.
      if (next.readyState !== EventSource.CLOSED) return
      // A 401 there sends the user to sign in (AppLayout); changed permissions restart this hook.
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
    for (const handler of handlers) handler.stop()
  }
}
