import { createColumnHelper } from "@tanstack/react-table"
import { CheckIcon, XIcon } from "lucide-react"
import { useMemo } from "react"
import { Link } from "react-router-dom"

import { useFormat } from "@/app/settings"
import { DataGrid, type GridFeatures } from "@/components/DataGrid"
import { SearchInput } from "@/components/SearchInput"
import { TopBarActions } from "@/components/TopBarActions"
import { cn } from "@/lib/utils"

import { useDeliveryNotes } from "./api"
import { deliveryNoteStatusLabels, type DeliveryNoteStatus, type DeliveryNoteSummary } from "./types"

const statusColours: Record<DeliveryNoteStatus, string> = {
  draft: "text-status-open",
  issued: "text-status-done",
  cancelled: "text-destructive",
}

export function DeliveryNoteStatusLabel({ status }: { status: DeliveryNoteStatus }) {
  return <span className={cn("font-medium", statusColours[status])}>{deliveryNoteStatusLabels[status]}</span>
}

const progressSteps = ["Draft", "Verified", "Issued"]

type ProgressNote = Pick<DeliveryNoteSummary, "status" | "itemVerifierId" | "itemIssuerId">

// Where a note sits on the Draft → Verified (item verifier added) → Issued (item issuer added) line, and its colours.
// A cancelled note stops in red at the step it had reached.
function progressOf({ status, itemVerifierId, itemIssuerId }: ProgressNote) {
  const reached = itemIssuerId ? 2 : itemVerifierId ? 1 : 0
  if (status === "cancelled") {
    return { reached, stopped: true, fill: "bg-destructive", text: "text-destructive", ring: "ring-destructive/25" }
  }
  if (reached === 2) {
    return { reached, stopped: false, fill: "bg-status-done", text: "text-status-done", ring: "ring-status-done/25" }
  }
  if (reached === 1) {
    return { reached, stopped: false, fill: "bg-status-confirmed", text: "text-status-confirmed", ring: "ring-status-confirmed/25" }
  }
  return { reached, stopped: false, fill: "bg-status-open", text: "text-status-open", ring: "ring-status-open/25" }
}

// Milestone bar for a note's status, like QuotationProgress. compact = one line for the list; otherwise step names and
// the status below.
export function DeliveryNoteProgress({ note, compact = false }: { note: ProgressNote; compact?: boolean }) {
  const { reached, stopped, fill, text, ring } = progressOf(note)
  // A draft with its verifier is waiting for the issuer.
  const label = note.status === "draft" && reached === 1 ? "Verified" : deliveryNoteStatusLabels[note.status]
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

const columnHelper = createColumnHelper<GridFeatures, DeliveryNoteSummary>()

// Notes are made by finalizing an invoice, so there's no Create button.
export function DeliveryNotesPage() {
  const format = useFormat()
  const notes = useDeliveryNotes()

  // Status is a searchable column, so typing "draft" in the search box shows only the drafts.
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("deliveryNoteNumber", {
          header: "Delivery Note No.",
          cell: (info) => (
            <Link to={`/delivery-notes/${info.row.original.id}`} className="font-medium hover:underline">
              {info.getValue()}
            </Link>
          ),
        }),
        columnHelper.accessor((note) => note.invoice.invoiceNumber ?? "—", { id: "invoice", header: "Invoice No." }),
        columnHelper.accessor((note) => `${note.invoice.customer.code} - ${note.invoice.customer.name}`, {
          id: "customer",
          header: "Customer",
        }),
        columnHelper.accessor("createdAt", { header: "Date", cell: (info) => format.date(info.getValue()) }),
        columnHelper.accessor((note) => note.itemVerifier?.name ?? "—", { id: "verifier", header: "Item verifier" }),
        columnHelper.accessor((note) => note.itemIssuer?.name ?? "—", { id: "issuer", header: "Item issuer" }),
        // The label the progress bar shows, so "verified" can be searched too.
        columnHelper.accessor((note) => (note.status === "draft" && note.itemVerifierId ? "Verified" : deliveryNoteStatusLabels[note.status]), {
          id: "status",
          header: "Status",
          cell: (info) => <DeliveryNoteProgress note={info.row.original} compact />,
        }),
      ]),
    [format],
  )

  return (
    <div className="space-y-4">
      <TopBarActions>
        <SearchInput placeholder="Search delivery note or invoice no., customer, status…" />
      </TopBarActions>
      <h1 className="text-2xl font-semibold">Delivery notes</h1>
      <DataGrid
        columns={columns}
        query={notes}
        label="delivery notes"
        getRowId={(note) => String(note.id)}
        rowHref={(note) => `/delivery-notes/${note.id}`}
      />
    </div>
  )
}
