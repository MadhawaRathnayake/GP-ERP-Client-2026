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
import { typeLabels } from "@/pages/Quotations/types"

import { useInvoices } from "./api"
import { invoiceNumberOf, invoiceStatusLabelOf, type InvoiceStatus, type InvoiceSummary } from "./types"

const statusColours: Record<InvoiceStatus, string> = {
  draft: "text-status-open",
  finalized: "text-status-done",
  cancelled: "text-destructive",
}

export function InvoiceStatusLabel({ invoice }: { invoice: Pick<InvoiceSummary, "status" | "invoiceNumber"> }) {
  return <span className={cn("font-medium", statusColours[invoice.status])}>{invoiceStatusLabelOf(invoice)}</span>
}

const progressSteps = ["Draft", "Finalized"]

// Where an invoice sits on the Draft → Finalized line, and its colours. A cancelled invoice stops in red at the step it
// had reached (finalized if it has an invoice number).
function progressOf({ status, invoiceNumber }: Pick<InvoiceSummary, "status" | "invoiceNumber">) {
  const finalized = invoiceNumber !== null
  switch (status) {
    case "finalized":
      return { reached: 1, stopped: false, fill: "bg-status-done", text: "text-status-done", ring: "ring-status-done/25" }
    case "cancelled":
      return { reached: finalized ? 1 : 0, stopped: true, fill: "bg-destructive", text: "text-destructive", ring: "ring-destructive/25" }
    default:
      return { reached: 0, stopped: false, fill: "bg-status-open", text: "text-status-open", ring: "ring-status-open/25" }
  }
}

// Milestone bar for an invoice's status, like QuotationProgress. compact = one line for the list; otherwise step names
// and the status below.
export function InvoiceProgress({
  invoice,
  compact = false,
}: {
  invoice: Pick<InvoiceSummary, "status" | "invoiceNumber">
  compact?: boolean
}) {
  const { reached, stopped, fill, text, ring } = progressOf(invoice)
  const label = invoiceStatusLabelOf(invoice)
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
        columnHelper.accessor((invoice) => invoiceStatusLabelOf(invoice), {
          id: "status",
          header: "Status",
          cell: (info) => <InvoiceProgress invoice={info.row.original} compact />,
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
