import { ArrowLeftIcon, ScanBarcodeIcon } from "lucide-react"
import { lazy, Suspense, type ReactNode } from "react"
import { Link, useParams } from "react-router-dom"

import { useCan } from "@/app/auth"
import { useFormat } from "@/app/settings"
import { QueryError } from "@/components/StatusView"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { ProductThumbnail } from "@/pages/Quotations/ProductPickerDialog"

import { useGoodsReceivedNote, useOrderReceipt } from "./api"
import { GoodsReceivedNoteStatusLabel } from "./GoodsReceivedNotesPage"
import { CreateGoodsReceivedNoteButton } from "./OrderReceiptSection"

// Loaded on its own, so the PDF library is only fetched when a GRN is opened.
const GoodsReceivedNotePdf = lazy(() =>
  import("./GoodsReceivedNoteDocument").then((module) => ({ default: module.GoodsReceivedNotePdf })),
)

// One order's GRN: every order line with what has arrived over its deliveries, the serials still to add, and each
// delivery. Recording another delivery and adding serials are the actions; there is no approval.
export function GoodsReceivedNotePage() {
  const { id = "" } = useParams()
  const can = useCan()
  const format = useFormat()
  const { data: note, isPending, isError, error } = useGoodsReceivedNote(id)
  // For "Record delivery" while something is still to come.
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
  const link = (permitted: boolean, to: string, label: string) =>
    permitted ? (
      <Link to={to} className="hover:underline">
        {label}
      </Link>
    ) : (
      label
    )
  const serialsMissing = note.items.reduce((total, item) => total + item.serialsMissing, 0)
  const canAddSerials = can("GOODS_RECEIVED_NOTES.ADD_SERIALS") && serialsMissing > 0

  const details: [string, ReactNode][] = [
    ["GRN number", number],
    ["Status", <GoodsReceivedNoteStatusLabel status={status} />],
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
    ["Prepared by", note.creator?.name ?? "—"],
    ["Created", format.dateTime(note.createdAt)],
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">GRN {number}</h1>
      <div className="space-y-6">
        <TopBarActions>
          <BackLink />
          <CreateGoodsReceivedNoteButton receipt={receipt.data} />
          {canAddSerials && (
            <Button asChild>
              <Link to={`/goods-received-notes/${note.id}/serials`}>
                <ScanBarcodeIcon />
                Add serial numbers
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

        {serialsMissing > 0 && (
          <p className="text-sm text-destructive">
            {serialsMissing} unit(s) arrived without serial numbers yet; they go into stock as their serials are added.
          </p>
        )}

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Products</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Image</TableHead>
                <TableHead className="text-right">Ordered</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Serial numbers</TableHead>
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
                  <TableCell className="text-right">{item.outstandingQuantity}</TableCell>
                  <TableCell className={cn(item.serialsMissing > 0 && "text-destructive")}>
                    {item.product.trackingType === "serial" ? (
                      <>
                        {item.serialsEntered} / {item.receivedQuantity}
                        {item.serialsEntered > 0 && can("SERIAL_ITEMS.VIEW") && (
                          <Link
                            to={`/serial-items?productId=${item.productId}`}
                            className="ml-2 text-xs text-muted-foreground underline underline-offset-4"
                          >
                            units
                          </Link>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Deliveries</h2>
          <ol className="max-w-3xl space-y-3">
            {note.deliveries.map((delivery) => (
              <li key={delivery.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">
                  Delivery {delivery.deliveryNo} · {format.date(delivery.receivedDate)}
                  {delivery.supplierInvoiceNumber && ` · supplier invoice ${delivery.supplierInvoiceNumber}`}
                  {delivery.isImported && <span className="font-normal text-muted-foreground"> · imported from the old system</span>}
                </p>
                {delivery.remarks && <p className="text-muted-foreground">{delivery.remarks}</p>}
                <ul className="mt-1 list-disc pl-5">
                  {delivery.items.map((item) => (
                    <li key={item.productId}>
                      {item.quantity} × {item.product.sku} {item.product.title}
                      {item.remarks && <span className="text-muted-foreground"> ({item.remarks})</span>}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-muted-foreground">
                  Recorded {format.dateTime(delivery.createdAt)}
                  {delivery.creator && ` by ${delivery.creator.name}`}
                </p>
              </li>
            ))}
          </ol>
          {receipt.data?.blockedReason && <p className="text-sm text-muted-foreground">{receipt.data.blockedReason}.</p>}
        </section>
      </div>

      <div className="mx-auto w-full max-w-5xl pt-2">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading the GRN document…</p>}>
          <GoodsReceivedNotePdf goodsReceivedNote={note} />
        </Suspense>
      </div>
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
