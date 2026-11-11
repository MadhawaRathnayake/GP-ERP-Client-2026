import { ArrowLeftIcon, BanIcon, CheckIcon, PencilIcon, XIcon } from "lucide-react"
import { lazy, Suspense, type ReactNode } from "react"
import { Link, useParams } from "react-router-dom"

import { useCan } from "@/app/auth"
import { useFormat } from "@/app/settings"
import { QueryError } from "@/components/StatusView"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ApprovalHistory, ReasonButton } from "@/pages/InternalRequisitions/InternalRequisitionPage"
import { ProductThumbnail } from "@/pages/Quotations/ProductPickerDialog"
import { ConfirmButton } from "@/pages/Quotations/QuotationPage"

import {
  useApproveGoodsReceivedNote,
  useCancelGoodsReceivedNote,
  useGoodsReceivedNote,
  useOrderReceipt,
  useRejectGoodsReceivedNote,
} from "./api"
import { GoodsReceivedNoteStatusLabel } from "./GoodsReceivedNotesPage"
import { CreateGoodsReceivedNoteButton, OrderReceiptSection } from "./OrderReceiptSection"
import { isOpen } from "./types"

// Loaded on its own, so the PDF library is only fetched when a GRN is opened.
const GoodsReceivedNotePdf = lazy(() =>
  import("./GoodsReceivedNoteDocument").then((module) => ({ default: module.GoodsReceivedNotePdf })),
)

export function GoodsReceivedNotePage() {
  const { id = "" } = useParams()
  const can = useCan()
  const format = useFormat()
  const { data: note, isPending, isError, error } = useGoodsReceivedNote(id)
  const approve = useApproveGoodsReceivedNote()
  const reject = useRejectGoodsReceivedNote()
  const cancel = useCancelGoodsReceivedNote()
  // For "Create GRN": once this one is approved, the rest of the order can come on another.
  const receipt = useOrderReceipt(String(note?.internalRequisitionId), note !== undefined)

  if (isPending || isError) {
    return (
      <div className="space-y-4">
        <TopBarActions>
          <BackLink />
        </TopBarActions>
        {isPending ? <p className="text-sm text-muted-foreground">Loading GRN…</p> : <QueryError error={error} />}
      </div>
    )
  }

  const { status, grnNumber: number, internalRequisition: requisition } = note
  // Who did it and when, e.g. "11 Nov 2026, 10:15 by Nimal".
  const when = (at: string | null, by: { name: string } | null) =>
    at ? `${format.dateTime(at)}${by ? ` by ${by.name}` : ""}` : "—"
  const link = (permitted: boolean, to: string, label: string) =>
    permitted ? (
      <Link to={to} className="hover:underline">
        {label}
      </Link>
    ) : (
      label
    )

  const details: [string, ReactNode][] = [
    ["GRN number", number],
    ["Status", <GoodsReceivedNoteStatusLabel status={status} />],
    ["Date", format.date(note.receivedDate)],
    [
      "Purchase order",
      requisition.purchaseOrder
        ? link(can("PURCHASE_ORDERS.VIEW"), `/purchase-orders/${requisition.purchaseOrder.id}`, requisition.purchaseOrder.purchaseOrderNumber)
        : "None (international IR)",
    ],
    [
      "Internal requisition",
      link(can("INTERNAL_REQUISITIONS.VIEW"), `/internal-requisitions/${requisition.id}`, requisition.internalRequisitionNumber),
    ],
    ["Supplier", link(can("SUPPLIERS.VIEW"), `/suppliers/${note.supplierId}`, `${note.supplier.code} - ${note.supplier.name}`)],
    ["Supplier VAT number", note.supplier.vatNumber ?? "—"],
    ["Supplier invoice number", note.supplierInvoiceNumber ?? "—"],
    ["Prepared by", note.creator?.name ?? "—"],
    ["Created", when(note.createdAt, note.creator)],
    ...(status === "cancelled"
      ? ([
          ["Cancelled", when(note.cancelledAt, note.canceller)],
          ["Reason for cancelling", note.cancelReason ?? "—"],
        ] satisfies [string, ReactNode][])
      : []),
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">GRN {number}</h1>
      <div className="space-y-6">
        <TopBarActions>
          <BackLink />
          <CreateGoodsReceivedNoteButton receipt={receipt.data} />
          {status === "pending" && can("GOODS_RECEIVED_NOTES.APPROVE") && (
            <ConfirmButton
              icon={<CheckIcon />}
              label="Approve"
              title={`Approve ${number}?`}
              description="The received quantities go into stock in hand. It can't be edited or cancelled after this."
              pending={approve.isPending}
              onConfirm={(close) => approve.mutate(note.id, { onSuccess: close })}
            />
          )}
          {status === "pending" && can("GOODS_RECEIVED_NOTES.REJECT") && (
            <ReasonButton
              icon={<XIcon />}
              label="Reject"
              title={`Reject ${number}?`}
              description="It goes back to whoever can edit it, who can change it and submit it again."
              pending={reject.isPending}
              onConfirm={(reason, close) => reject.mutate({ id: note.id, reason }, { onSuccess: close })}
            />
          )}
          {isOpen(status) && can("GOODS_RECEIVED_NOTES.CANCEL") && (
            <ReasonButton
              icon={<BanIcon />}
              label="Cancel GRN"
              title={`Cancel ${number}?`}
              description="Nothing has gone into stock. The order can then be received on a new GRN. This can't be undone."
              destructive
              pending={cancel.isPending}
              onConfirm={(reason, close) => cancel.mutate({ id: note.id, reason }, { onSuccess: close })}
            />
          )}
          {isOpen(status) && can("GOODS_RECEIVED_NOTES.EDIT") && (
            <Button asChild>
              <Link to={`/goods-received-notes/${note.id}/edit`}>
                <PencilIcon />
                {status === "rejected" ? "Edit & resubmit" : "Edit"}
              </Link>
            </Button>
          )}
        </TopBarActions>
        <dl className="max-w-3xl border-t">
          {details.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[minmax(8rem,14rem)_1fr] gap-4 border-b px-2 py-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="min-w-0 break-words whitespace-pre-line">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">This delivery</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Image</TableHead>
                <TableHead className="text-right">Ordered</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {note.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.lineNo}</TableCell>
                  <TableCell>{item.product.sku}</TableCell>
                  <TableCell className="whitespace-normal">{item.product.title}</TableCell>
                  <TableCell>
                    <ProductThumbnail src={item.product.imageUrl} alt={item.product.title} />
                  </TableCell>
                  <TableCell className="text-right">{item.orderedQuantity}</TableCell>
                  <TableCell className="text-right font-medium">{item.receivedQuantity}</TableCell>
                  <TableCell className="whitespace-normal">{item.remarks ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <OrderReceiptSection internalRequisitionId={note.internalRequisitionId} />

        <ApprovalHistory approvals={note.approvals} />
      </div>

      {status !== "cancelled" && (
        <div className="mx-auto w-full max-w-5xl pt-2">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading the GRN document…</p>}>
            <GoodsReceivedNotePdf goodsReceivedNote={note} />
          </Suspense>
        </div>
      )}
    </div>
  )
}

function BackLink() {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link to="/goods-received-notes">
        <ArrowLeftIcon />
        Back to goods received notes
      </Link>
    </Button>
  )
}
