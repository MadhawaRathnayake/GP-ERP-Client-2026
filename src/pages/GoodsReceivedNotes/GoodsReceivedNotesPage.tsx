import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { Link } from "react-router-dom"

import { useFormat } from "@/app/settings"
import { DataGrid, type GridFeatures } from "@/components/DataGrid"
import { SearchInput } from "@/components/SearchInput"
import { TopBarActions } from "@/components/TopBarActions"
import { cn } from "@/lib/utils"

import { useGoodsReceivedNotes } from "./api"
import { statusLabels, type GoodsReceivedNoteStatus, type GoodsReceivedNoteSummary } from "./types"

const statusColours: Record<GoodsReceivedNoteStatus, string> = {
  partiallyCompleted: "text-status-open",
  needSerialNumbers: "text-destructive",
  completed: "text-status-confirmed",
}

export function GoodsReceivedNoteStatusLabel({ status }: { status: GoodsReceivedNoteStatus }) {
  return <span className={cn("font-medium", statusColours[status])}>{statusLabels[status]}</span>
}

const columnHelper = createColumnHelper<GridFeatures, GoodsReceivedNoteSummary>()

// No Create button: goods are received against an approved purchase order or an approved international internal
// requisition ("Record delivery" there).
export function GoodsReceivedNotesPage() {
  const format = useFormat()
  const notes = useGoodsReceivedNotes()

  // Status is a searchable column, so typing "serial" in the search box shows the GRNs that need serial numbers.
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("grnNumber", {
          header: "GRN No.",
          cell: (info) => (
            <Link to={`/goods-received-notes/${info.row.original.id}`} className="font-medium hover:underline">
              {info.getValue()}
            </Link>
          ),
        }),
        columnHelper.accessor((grn) => grn.deliveries.at(-1)?.receivedDate ?? "", {
          id: "lastDelivery",
          header: "Last delivery",
          cell: (info) => (info.getValue() ? format.date(info.getValue()) : "—"),
        }),
        columnHelper.accessor((grn) => grn.deliveries.length, { id: "deliveries", header: "Deliveries" }),
        columnHelper.accessor((grn) => grn.internalRequisition.purchaseOrder?.purchaseOrderNumber ?? "—", { id: "po", header: "PO No." }),
        columnHelper.accessor((grn) => grn.internalRequisition.internalRequisitionNumber, { id: "ir", header: "IR No." }),
        columnHelper.accessor((grn) => `${grn.supplier.code} - ${grn.supplier.name}`, { id: "supplier", header: "Supplier" }),
        columnHelper.accessor(
          (grn) => grn.deliveries.flatMap((delivery) => (delivery.supplierInvoiceNumber ? [delivery.supplierInvoiceNumber] : [])).join(", ") || "—",
          { id: "supplierInvoice", header: "Supplier invoices" },
        ),
        columnHelper.accessor((grn) => grn.creator?.name ?? "—", { id: "preparedBy", header: "Prepared by" }),
        columnHelper.accessor((grn) => statusLabels[grn.status], {
          id: "status",
          header: "Status",
          cell: (info) => <GoodsReceivedNoteStatusLabel status={info.row.original.status} />,
        }),
      ]),
    [format],
  )

  return (
    <div className="space-y-4">
      <TopBarActions>
        <SearchInput placeholder="Search GRN no., PO no., IR no., supplier, invoice, status…" />
      </TopBarActions>
      <h1 className="text-2xl font-semibold">Goods received notes</h1>
      <DataGrid
        columns={columns}
        query={notes}
        label="goods received notes"
        getRowId={(grn) => String(grn.id)}
        rowHref={(grn) => `/goods-received-notes/${grn.id}`}
      />
    </div>
  )
}
