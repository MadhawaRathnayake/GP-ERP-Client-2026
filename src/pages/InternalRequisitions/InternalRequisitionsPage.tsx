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

import { useInternalRequisitions } from "./api"
import { statusLabels, type InternalRequisitionStatus, type InternalRequisitionSummary } from "./types"

const statusColours: Record<InternalRequisitionStatus, string> = {
  pending: "text-status-open",
  approved: "text-status-confirmed",
  rejected: "text-destructive",
  cancelled: "text-destructive",
  cancelledAfterApproved: "text-destructive",
}

export function InternalRequisitionStatusLabel({ status }: { status: InternalRequisitionStatus }) {
  return <span className={cn("font-medium", statusColours[status])}>{statusLabels[status]}</span>
}

const progressSteps = ["Created", "Approved"]

// Where an IR sits on the Created → Approved line, and its colours. A rejected or cancelled IR stops in red at the step
// it had reached.
function progressOf(status: InternalRequisitionStatus) {
  switch (status) {
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

// Milestone bar for an IR's status, like QuotationProgress. compact = one line for the list; otherwise step names and
// the status below.
export function InternalRequisitionProgress({ status, compact = false }: { status: InternalRequisitionStatus; compact?: boolean }) {
  const { reached, stopped, fill, text, ring } = progressOf(status)
  const label = statusLabels[status]
  const pending = stopped ? "bg-destructive/25" : "bg-muted-foreground/25"

  const bar = (
    <div className={cn("flex items-center", compact ? "w-16 shrink-0" : "w-full")} aria-hidden>
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
      <div className="flex justify-between text-sm text-muted-foreground">
        {progressSteps.map((step) => (
          <span key={step}>{step}</span>
        ))}
      </div>
      <p className="text-center text-sm">
        Status: <span className={cn("font-medium", text)}>{label}</span>
      </p>
    </div>
  )
}

const columnHelper = createColumnHelper<GridFeatures, InternalRequisitionSummary>()

export function InternalRequisitionsPage() {
  const can = useCan()
  const format = useFormat()
  const requisitions = useInternalRequisitions()

  // Status is a searchable column, so typing "pending" in the search box shows only those.
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("internalRequisitionNumber", {
          header: "IR No.",
          cell: (info) => (
            <Link to={`/internal-requisitions/${info.row.original.id}`} className="font-medium hover:underline">
              {info.getValue()}
            </Link>
          ),
        }),
        columnHelper.accessor("createdAt", { header: "Date", cell: (info) => format.date(info.getValue()) }),
        columnHelper.accessor((ir) => `${ir.supplier.code} - ${ir.supplier.name}`, { id: "supplier", header: "Supplier" }),
        columnHelper.accessor((ir) => ir.creator?.name ?? "—", { id: "preparedBy", header: "Prepared by" }),
        columnHelper.accessor((ir) => (ir.isInternational ? "International" : "Local"), { id: "origin", header: "Local / international" }),
        columnHelper.accessor((ir) => ir.eta ?? "", {
          id: "eta",
          header: "ETA",
          cell: (info) => (info.getValue() ? format.date(info.getValue()) : "—"),
        }),
        columnHelper.accessor((ir) => statusLabels[ir.status], {
          id: "status",
          header: "Status",
          cell: (info) => <InternalRequisitionProgress status={info.row.original.status} compact />,
        }),
      ]),
    [format],
  )

  return (
    <div className="space-y-4">
      <TopBarActions>
        <SearchInput placeholder="Search IR no., supplier, prepared by, status…" />
        {can("INTERNAL_REQUISITIONS.CREATE") && (
          <Button asChild>
            <Link to="/internal-requisitions/create">
              <PlusIcon />
              Create new
            </Link>
          </Button>
        )}
      </TopBarActions>
      <h1 className="text-2xl font-semibold">Internal requisitions</h1>
      <DataGrid
        columns={columns}
        query={requisitions}
        label="internal requisitions"
        getRowId={(ir) => String(ir.id)}
        rowHref={(ir) => `/internal-requisitions/${ir.id}`}
      />
    </div>
  )
}
