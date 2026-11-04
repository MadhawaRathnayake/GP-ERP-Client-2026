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

import { useQuotations } from "./api"
import { quotationNumber, type QuotationStatus, type QuotationSummary } from "./types"

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
  creditConfirmed: "Credit confirmed",
  paymentConfirmed: "Payment confirmed",
  invoiceCreated: "Invoice created",
}

export function StatusText({ status }: { status: QuotationStatus }) {
  return (
    <span
      className={cn(
        status === "cancelled" && "text-destructive",
        status === "active" && "text-muted-foreground",
        (status === "paymentConfirmed" || status === "creditConfirmed" || status === "invoiceCreated") && "font-medium",
      )}
    >
      {statusLabels[status]}
    </span>
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
        columnHelper.accessor("quotationDate", { header: "Date", cell: (info) => format.date(info.getValue()) }),
        columnHelper.accessor((quotation) => quotation.salesManager.name, { id: "salesManager", header: "Sales manager" }),
        columnHelper.accessor("grandTotal", {
          header: "Total",
          // A cancelled quotation is worth nothing; its total stays on the detail page.
          cell: (info) =>
            info.row.original.status === "cancelled" ? (
              <span className="text-muted-foreground line-through">{format.money(info.getValue())}</span>
            ) : (
              format.money(info.getValue())
            ),
        }),
        columnHelper.accessor((quotation) => statusLabels[quotation.status], {
          id: "status",
          header: "Status",
          cell: (info) => <StatusText status={info.row.original.status} />,
        }),
      ]),
    [format],
  )

  return (
    <div className="space-y-4">
      <TopBarActions>
        <SearchInput placeholder="Search number, customer, sales manager, status…" />
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
