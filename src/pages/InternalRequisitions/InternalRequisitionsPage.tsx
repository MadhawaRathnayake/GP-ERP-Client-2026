import { createColumnHelper } from "@tanstack/react-table"
import { PlusIcon } from "lucide-react"
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
          cell: (info) => <InternalRequisitionStatusLabel status={info.row.original.status} />,
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
