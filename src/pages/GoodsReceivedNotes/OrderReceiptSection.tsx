import { PackageOpenIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { useCan } from "@/app/auth"
import { useFormat } from "@/app/settings"
import { QueryError } from "@/components/StatusView"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { useOrderReceipt } from "./api"
import { GoodsReceivedNoteStatusLabel } from "./GoodsReceivedNotesPage"
import type { OrderReceipt } from "./types"

type ReceiptLine = OrderReceipt["lines"][number]

// The old view's line status, for the whole order rather than one GRN.
function lineStatus({ receivedQuantity, outstandingQuantity }: ReceiptLine) {
  if (outstandingQuantity === 0) return { label: "Received in full", colour: "text-status-confirmed" }
  if (receivedQuantity > 0) return { label: "Partly received", colour: "text-status-open" }
  return { label: "Not received", colour: "text-muted-foreground" }
}

// For the page's action buttons: opens the new-GRN form for the order, when one can be made now and the user may.
export function CreateGoodsReceivedNoteButton({ receipt }: { receipt: OrderReceipt | undefined }) {
  const can = useCan()
  if (!receipt || receipt.blockedReason || !can("GOODS_RECEIVED_NOTES.CREATE")) return null
  return (
    <Button asChild>
      <Link to={`/goods-received-notes/create?internalRequisitionId=${receipt.internalRequisitionId}`}>
        <PackageOpenIcon />
        Create GRN
      </Link>
    </Button>
  )
}

// What an order (an IR's purchase order, or an international IR) has received on approved GRNs, line by line, and its
// GRNs. On the purchase order page, the international IR page and the GRN page, each of which also has
// CreateGoodsReceivedNoteButton with its action buttons.
export function OrderReceiptSection({ internalRequisitionId }: { internalRequisitionId: number }) {
  const can = useCan()
  const format = useFormat()
  const { data: receipt, isPending, isError, error } = useOrderReceipt(String(internalRequisitionId))
  const canCreate = can("GOODS_RECEIVED_NOTES.CREATE")

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Goods received</h2>
      {isPending ? (
        <p className="text-sm text-muted-foreground">Loading what has been received…</p>
      ) : isError ? (
        <QueryError error={error} />
      ) : (
        <>
          {/* Says why there's no Create GRN button. */}
          {receipt.blockedReason && canCreate && <p className="text-sm text-muted-foreground">{receipt.blockedReason}.</p>}
          {receipt.lines.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipt.lines.map((line) => {
                  const status = lineStatus(line)
                  return (
                    <TableRow key={line.productId}>
                      <TableCell>{line.product.sku}</TableCell>
                      <TableCell className="whitespace-normal">{line.product.title}</TableCell>
                      <TableCell className="text-right">{line.orderedQuantity}</TableCell>
                      <TableCell className="text-right">{line.receivedQuantity}</TableCell>
                      <TableCell className="text-right font-medium">{line.outstandingQuantity}</TableCell>
                      <TableCell className={cn("font-medium", status.colour)}>{status.label}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          <p className="text-sm text-muted-foreground">Received counts approved GRNs only.</p>
          {receipt.goodsReceivedNotes.length > 0 && (
            <ul className="max-w-3xl border-t">
              {receipt.goodsReceivedNotes.map((note) => (
                <li key={note.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-2 py-2">
                  <Link to={`/goods-received-notes/${note.id}`} className="font-medium hover:underline">
                    {note.grnNumber}
                  </Link>
                  <span className="text-sm text-muted-foreground">{format.date(note.receivedDate)}</span>
                  <GoodsReceivedNoteStatusLabel status={note.status} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
