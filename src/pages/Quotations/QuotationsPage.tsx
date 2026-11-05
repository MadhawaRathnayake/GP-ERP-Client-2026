import { createColumnHelper } from "@tanstack/react-table"
import { CheckIcon, PlusIcon, XIcon } from "lucide-react"
import { useMemo } from "react"
import { Link } from "react-router-dom"

import { useCan } from "@/app/auth"
import { useFormat } from "@/app/settings"
import { DataGrid, type GridFeatures } from "@/components/DataGrid"
import { SearchInput } from "@/components/SearchInput"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useQuotations } from "./api"
import { isCancelled, quotationNumber, typeLabels, type QuotationStatus, type QuotationSummary } from "./types"

const statusLabels: Record<QuotationStatus, string> = {
  draft: "Draft",
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  active: "Active",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  cancelled: "Cancelled",
  cancelledAfterCredit: "Cancelled after credit",
  cancelledAfterPayment: "Cancelled after payment",
  creditConfirmed: "Credit confirmed",
  paymentConfirmed: "Payment confirmed",
  invoiceCreated: "Invoice created",
}

const progressSteps = ["Created", "Confirmed", "Invoiced"]

// Where a status sits on the Created → Confirmed → Invoiced line, and its colours. A cancelled quotation stops in red
// at the step it had reached.
function progressOf(status: QuotationStatus) {
  switch (status) {
    case "invoiceCreated":
      return { reached: 2, stopped: false, fill: "bg-status-done", text: "text-status-done", ring: "ring-status-done/25" }
    case "paymentConfirmed":
    case "creditConfirmed":
    case "accepted":
      return {
        reached: 1,
        stopped: false,
        fill: "bg-status-confirmed",
        text: "text-status-confirmed",
        ring: "ring-status-confirmed/25",
      }
    case "cancelled":
    case "declined":
    case "rejected":
    case "expired":
      return { reached: 0, stopped: true, fill: "bg-destructive", text: "text-destructive", ring: "ring-destructive/25" }
    case "cancelledAfterCredit":
    case "cancelledAfterPayment":
      return { reached: 1, stopped: true, fill: "bg-destructive", text: "text-destructive", ring: "ring-destructive/25" }
    default:
      return { reached: 0, stopped: false, fill: "bg-status-open", text: "text-status-open", ring: "ring-status-open/25" }
  }
}

// Milestone bar for a quotation's status. compact = one line for the list; otherwise step names and the status below.
export function QuotationProgress({
  status,
  isDeleted = false,
  compact = false,
}: {
  status: QuotationStatus
  isDeleted?: boolean
  compact?: boolean
}) {
  const { reached, stopped, fill, text, ring } = progressOf(status)
  const label = statusLabels[status] + (isDeleted ? " (deleted)" : "")
  const pending = stopped ? "bg-destructive/25" : "bg-muted-foreground/25"
  const confirmedLabel =
    status === "paymentConfirmed" || status === "cancelledAfterPayment"
      ? "Payment confirmed"
      : status === "creditConfirmed" || status === "cancelledAfterCredit"
        ? "Credit confirmed"
        : "Confirmed"

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
      <span className={cn("flex items-center gap-3", isDeleted && "opacity-50")} title={label}>
        {bar}
        <span className={cn("font-medium", text)}>{label}</span>
      </span>
    )
  }

  return (
    <div className={cn("space-y-2", isDeleted && "opacity-50")}>
      {bar}
      <div className="grid grid-cols-3 text-sm text-muted-foreground">
        <span>{progressSteps[0]}</span>
        <span className="text-center">{confirmedLabel}</span>
        <span className="text-right">{progressSteps[2]}</span>
      </div>
      <p className="text-center text-sm">
        Status: <span className={cn("font-medium", text)}>{label}</span>
      </p>
    </div>
  )
}

const columnHelper = createColumnHelper<GridFeatures, QuotationSummary>()

export function QuotationsPage() {
  const can = useCan()
  const format = useFormat()
  const quotations = useQuotations()

  // Status and sales manager are searchable columns, so the search box also filters by them.
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor((quotation) => quotationNumber(quotation.id), {
          id: "number",
          header: "No.",
          cell: (info) => (
            <Link to={`/quotations/${info.row.original.id}`} className="font-medium hover:underline">
              {info.getValue()}
            </Link>
          ),
        }),
        columnHelper.accessor((quotation) => `${quotation.customer.code} - ${quotation.customer.name}`, {
          id: "customer",
          header: "Customer",
        }),
        columnHelper.accessor((quotation) => typeLabels[quotation.type], { id: "type", header: "Type" }),
        columnHelper.accessor("quotationDate", { header: "Date", cell: (info) => format.date(info.getValue()) }),
        columnHelper.accessor((quotation) => quotation.salesManager.name, { id: "salesManager", header: "Sales manager" }),
        columnHelper.accessor("grandTotal", {
          header: "Total",
          // A cancelled quotation is worth nothing; its total stays on the detail page.
          cell: (info) =>
            isCancelled(info.row.original.status) ? (
              <span className="text-muted-foreground line-through">{format.money(info.getValue())}</span>
            ) : (
              format.money(info.getValue())
            ),
        }),
        columnHelper.accessor((quotation) => statusLabels[quotation.status], {
          id: "status",
          header: "Status",
          cell: (info) => (
            <QuotationProgress status={info.row.original.status} isDeleted={info.row.original.isDeleted} compact />
          ),
        }),
      ]),
    [format],
  )

  return (
    <div className="space-y-4">
      <TopBarActions>
        <SearchInput placeholder="Search number, customer, type, sales manager, status…" />
        {can("QUOTATIONS.CREATE") && (
          <Button asChild>
            <Link to="/quotations/create">
              <PlusIcon />
              Create new
            </Link>
          </Button>
        )}
      </TopBarActions>
      <h1 className="text-2xl font-semibold">Quotations</h1>
      <DataGrid
        columns={columns}
        query={quotations}
        label="quotations"
        getRowId={(quotation) => String(quotation.id)}
        rowHref={(quotation) => `/quotations/${quotation.id}`}
      />
    </div>
  )
}
