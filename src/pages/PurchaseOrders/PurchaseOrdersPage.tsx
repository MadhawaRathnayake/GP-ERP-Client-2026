import { createColumnHelper } from "@tanstack/react-table"
import { CheckIcon, XIcon } from "lucide-react"
import { useMemo } from "react"
import { Link } from "react-router-dom"

import { useFormat } from "@/app/settings"
import { DataGrid, type GridFeatures } from "@/components/DataGrid"
import { SearchInput } from "@/components/SearchInput"
import { TopBarActions } from "@/components/TopBarActions"
import { cn } from "@/lib/utils"

import { usePurchaseOrders } from "./api"
import { statusLabels, type PurchaseOrderStatus, type PurchaseOrderSummary } from "./types"

const statusColours: Record<PurchaseOrderStatus, string> = {
  pending: "text-status-open",
  approved: "text-status-confirmed",
  rejected: "text-destructive",
  completed: "text-status-confirmed",
  cancelled: "text-destructive",
  cancelledAfterApproved: "text-destructive",
}

export function PurchaseOrderStatusLabel({ status }: { status: PurchaseOrderStatus }) {
  return <span className={cn("font-medium", statusColours[status])}>{statusLabels[status]}</span>
}

const progressSteps = ["Created", "Approved", "Completed"]

// Where a PO sits on the Created → Approved → Completed (by its GRN) line, and its colours. A rejected or cancelled PO
// stops in red at the step it had reached.
function progressOf(status: PurchaseOrderStatus) {
  switch (status) {
    case "completed":
      return { reached: 2, stopped: false, fill: "bg-status-done", text: "text-status-done", ring: "ring-status-done/25" }
    case "approved":
      return { reached: 1, stopped: false, fill: "bg-status-confirmed", text: "text-status-confirmed", ring: "ring-status-confirmed/25" }
    case "cancelledAfterApproved":
      return { reached: 1, stopped: true, fill: "bg-destructive", text: "text-destructive", ring: "ring-destructive/25" }
    case "rejected":
    case "cancelled":
      return { reached: 0, stopped: true, fill: "bg-destructive", text: "text-destructive", ring: "ring-destructive/25" }
    default:
      return { reached: 0, stopped: false, fill: "bg-status-open", text: "text-status-open", ring: "ring-status-open/25" }
  }
}

// Milestone bar for a PO's status, like QuotationProgress. compact = one line for the list; otherwise step names and
// the status below.
export function PurchaseOrderProgress({ status, compact = false }: { status: PurchaseOrderStatus; compact?: boolean }) {
  const { reached, stopped, fill, text, ring } = progressOf(status)
  const label = statusLabels[status]
  const pending = stopped ? "bg-destructive/25" : "bg-muted-foreground/25"

  const bar = (
    <div className={cn("flex items-center", compact ? "w-24 shrink-0" : "w-full")} aria-hidden>
      {progressSteps.map((step, index) => (
        <div key={step} className={cn("flex items-center", index > 0 && "flex-1")}>
          {index > 0 && (
            <div className={cn("flex-1 rounded-full", compact ? "h-0.5" : "h-1", index <= reached ? fill : pending)} />
          )}
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full text-background",
              compact ? "size-2.5" : "size-5",
              index <= reached ? fill : pending,
              index === reached && !compact && `ring-4 ${ring}`,
            )}
          >
            {!compact &&
              index <= reached &&
              (stopped && index === reached ? <XIcon className="size-3" /> : <CheckIcon className="size-3" />)}
          </div>
        </div>
      ))}
    </div>
  )

  if (compact) {
    return (
      <span className="flex items-center gap-3" title={label}>
        {bar}
        <span className={cn("font-medium", text)}>{label}</span>
      </span>
    )
  }

  return (
    <div className="space-y-2">
      {bar}
      <div className="grid grid-cols-3 text-sm text-muted-foreground">
        <span>{progressSteps[0]}</span>
        <span className="text-center">{progressSteps[1]}</span>
        <span className="text-right">{progressSteps[2]}</span>
      </div>
      <p className="text-center text-sm">
        Status: <span className={cn("font-medium", text)}>{label}</span>
      </p>
    </div>
  )
}

const columnHelper = createColumnHelper<GridFeatures, PurchaseOrderSummary>()

// No Create button: a PO is made from a local internal requisition ("Approve & create purchase order" there).
export function PurchaseOrdersPage() {
  const format = useFormat()
  const orders = usePurchaseOrders()

  // Status is a searchable column, so typing "pending" in the search box shows only those.
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("purchaseOrderNumber", {
          header: "PO No.",
          cell: (info) => (
            <Link to={`/purchase-orders/${info.row.original.id}`} className="font-medium hover:underline">
              {info.getValue()}
            </Link>
          ),
        }),
        columnHelper.accessor("purchaseOrderDate", { header: "Date", cell: (info) => format.date(info.getValue()) }),
        columnHelper.accessor((po) => po.internalRequisition.internalRequisitionNumber, { id: "ir", header: "IR No." }),
        columnHelper.accessor((po) => `${po.supplier.code} - ${po.supplier.name}`, { id: "supplier", header: "Supplier" }),
        columnHelper.accessor((po) => po.creator?.name ?? "—", { id: "createdBy", header: "Created by" }),
        columnHelper.accessor("grandTotal", {
          header: () => <div className="text-right">Total</div>,
          cell: (info) => <div className="text-right">{format.money(info.getValue())}</div>,
        }),
        columnHelper.accessor((po) => statusLabels[po.status], {
          id: "status",
          header: "Status",
          cell: (info) => <PurchaseOrderProgress status={info.row.original.status} compact />,
        }),
      ]),
    [format],
  )

  return (
    <div className="space-y-4">
      <TopBarActions>
        <SearchInput placeholder="Search PO no., IR no., supplier, status…" />
      </TopBarActions>
      <h1 className="text-2xl font-semibold">Purchase orders</h1>
      <DataGrid
        columns={columns}
        query={orders}
        label="purchase orders"
        getRowId={(po) => String(po.id)}
        rowHref={(po) => `/purchase-orders/${po.id}`}
      />
    </div>
  )
}
