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
import { typeLabels } from "@/pages/Quotations/types"

import { useInvoices } from "./api"
import { invoiceNumberOf, statusLabels, type InvoiceStatus, type InvoiceSummary } from "./types"

const statusColours: Record<InvoiceStatus, string> = {
  draft: "text-status-open",
  finalized: "text-status-done",
  cancelled: "text-destructive",
}

export function InvoiceStatusLabel({ status }: { status: InvoiceStatus }) {
  return <span className={cn("font-medium", statusColours[status])}>{statusLabels[status]}</span>
}

const columnHelper = createColumnHelper<GridFeatures, InvoiceSummary>()

export function InvoicesPage() {
  const can = useCan()
  const format = useFormat()
  const invoices = useInvoices()

  // Status is a searchable column, so typing "draft" or "cancelled" in the search box filters by it.
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor((invoice) => invoiceNumberOf(invoice), {
          id: "number",
          header: "Invoice No.",
          cell: (info) => (
            <Link to={`/invoices/${info.row.original.id}`} className="font-medium hover:underline">
              {info.getValue()}
            </Link>
          ),
        }),
        columnHelper.accessor((invoice) => invoice.quotation?.quotationNumber ?? "—", { id: "quotation", header: "Quotation No." }),
        columnHelper.accessor((invoice) => typeLabels[invoice.type], { id: "type", header: "Type" }),
        columnHelper.accessor((invoice) => `${invoice.customer.code} - ${invoice.customer.name}`, {
          id: "customer",
          header: "Customer",
        }),
        columnHelper.accessor("grandTotal", {
          header: "Amount",
          // A cancelled invoice is worth nothing; its amount stays on the detail page.
          cell: (info) =>
            info.row.original.status === "cancelled" ? (
              <span className="text-muted-foreground line-through">{format.money(info.getValue())}</span>
            ) : (
              format.money(info.getValue())
            ),
        }),
        // The date printed on the invoice: when it was finalized, else when the draft was made.
        columnHelper.accessor((invoice) => invoice.finalizedAt ?? invoice.createdAt, {
          id: "date",
          header: "Date",
          cell: (info) => format.date(info.getValue()),
        }),
        columnHelper.accessor((invoice) => statusLabels[invoice.status], {
          id: "status",
          header: "Status",
          cell: (info) => <InvoiceStatusLabel status={info.row.original.status} />,
        }),
      ]),
    [format],
  )

  return (
    <div className="space-y-4">
      <TopBarActions>
        <SearchInput placeholder="Search invoice or quotation no., customer, type, status…" />
        {/* Invoices are made from confirmed quotations; this is only for roles given INVOICES.CREATE_DIRECT. */}
        {can("INVOICES.CREATE_DIRECT") && (
          <Button asChild>
            <Link to="/invoices/create">
              <PlusIcon />
              Create new
            </Link>
          </Button>
        )}
      </TopBarActions>
      <h1 className="text-2xl font-semibold">Invoices</h1>
      <DataGrid
        columns={columns}
        query={invoices}
        label="invoices"
        getRowId={(invoice) => String(invoice.id)}
        rowHref={(invoice) => `/invoices/${invoice.id}`}
      />
    </div>
  )
}
