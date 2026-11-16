import { BanIcon, CheckIcon, PencilIcon, XIcon } from "lucide-react"
import { type ReactNode } from "react"
import { Link, useParams } from "react-router-dom"

import { useCan } from "@/app/auth"
import { useFormat } from "@/app/settings"
import { QueryError } from "@/components/StatusView"
import { TopBarActions } from "@/components/TopBarActions"
import { BackButton, PdfButtons, TopBarButton } from "@/components/TopBarButton"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCountryName } from "@/pages/Countries/api"
import { ApprovalHistory, ReasonButton } from "@/pages/InternalRequisitions/InternalRequisitionPage"
import { ProductThumbnail } from "@/pages/Quotations/ProductPickerDialog"
import { useOrderReceipt } from "@/pages/GoodsReceivedNotes/api"
import { CreateGoodsReceivedNoteButton, OrderReceiptSection } from "@/pages/GoodsReceivedNotes/OrderReceiptSection"
import { ConfirmButton } from "@/pages/Quotations/QuotationPage"

import { useApprovePurchaseOrder, useCancelPurchaseOrder, usePurchaseOrder, useRejectPurchaseOrder } from "./api"
import { PurchaseOrderProgress, PurchaseOrderStatusLabel } from "./PurchaseOrdersPage"
import { isCancelled, isEditable, isPrintable, type PurchaseOrderItem } from "./types"

// "10%", "Rs 500.00" or "—", as entered.
function discountLabel(item: PurchaseOrderItem, money: (value: number) => string) {
  if (item.discountType === "percentage") return `${item.discountValue}%`
  if (item.discountType === "fixed") return money(item.discountValue)
  return "—"
}

export function PurchaseOrderPage() {
  const { id = "" } = useParams()
  const countryName = useCountryName()
  const can = useCan()
  const format = useFormat()
  const { data: order, isPending, isError, error } = usePurchaseOrder(id)
  const approve = useApprovePurchaseOrder()
  const reject = useRejectPurchaseOrder()
  const cancel = useCancelPurchaseOrder()
  // Goods are received on an approved PO; once some have been, it can't be cancelled.
  const showsReceipt = can("GOODS_RECEIVED_NOTES.VIEW") && (order?.status === "approved" || order?.status === "completed")
  const receipt = useOrderReceipt(String(order?.internalRequisitionId), showsReceipt)
  const goodsReceived = receipt.data?.lines.some((line) => line.receivedQuantity > 0) ?? false

  if (isPending || isError) {
    return (
      <div className="space-y-4">
        <TopBarActions>
          <BackButton to="/purchase-orders" label="Purchase orders" />
        </TopBarActions>
        {isPending ? <p className="text-sm text-muted-foreground">Loading purchase order…</p> : <QueryError error={error} />}
      </div>
    )
  }

  const { status, purchaseOrderNumber: number } = order
  const irNumber = order.internalRequisition.internalRequisitionNumber
  // Who did it and when, e.g. "9 Nov 2026, 10:15 by Nimal".
  const when = (at: string | null, by: { name: string } | null) =>
    at ? `${format.dateTime(at)}${by ? ` by ${by.name}` : ""}` : "—"
  const vatRate = order.items[0]?.taxRate ?? 0

  const details: [string, ReactNode][] = [
    ["PO number", number],
    ["Status", <PurchaseOrderStatusLabel status={status} />],
    ["Date", format.date(order.purchaseOrderDate)],
    [
      "Internal requisition",
      can("INTERNAL_REQUISITIONS.VIEW") ? (
        <Link to={`/internal-requisitions/${order.internalRequisitionId}`} className="hover:underline">
          {irNumber}
        </Link>
      ) : (
        irNumber
      ),
    ],
    [
      "Supplier",
      can("SUPPLIERS.VIEW") ? (
        <Link to={`/suppliers/${order.supplierId}`} className="hover:underline">
          {order.supplier.code} - {order.supplier.name}
        </Link>
      ) : (
        `${order.supplier.code} - ${order.supplier.name}`
      ),
    ],
    ["Supplier VAT number", order.supplier.vatNumber ?? "—"],
    ["Comments (printed)", order.comments ?? "—"],
    ["Remarks (internal)", order.remarks ?? "—"],
    ["Created", when(order.createdAt, order.creator)],
    ...(isCancelled(status)
      ? ([
          ["Cancelled", when(order.cancelledAt, order.canceller)],
          ["Reason for cancelling", order.cancelReason ?? "—"],
        ] satisfies [string, ReactNode][])
      : []),
  ]

  const totals: [string, number][] = [
    ["Subtotal", order.subtotal],
    ["Discount", -order.discountTotal],
    [`VAT (${vatRate}%)`, order.taxTotal],
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Purchase order {number}</h1>
      <div className="space-y-6">
        <div className="max-w-3xl px-2">
          <PurchaseOrderProgress status={status} />
        </div>
        <TopBarActions>
          <BackButton to="/purchase-orders" label="Purchase orders" />
          <CreateGoodsReceivedNoteButton receipt={receipt.data} />
          {status === "pending" && can("PURCHASE_ORDERS.APPROVE") && (
            <ConfirmButton
              icon={CheckIcon}
              label="Approve"
              primary
              title={`Approve ${number}?`}
              description="It can't be edited after this."
              pending={approve.isPending}
              onConfirm={(close) => approve.mutate(order.id, { onSuccess: close })}
            />
          )}
          {status === "pending" && can("PURCHASE_ORDERS.REJECT") && (
            <ReasonButton
              icon={XIcon}
              label="Reject"
              title={`Reject ${number}?`}
              description="It goes back to whoever can edit it, who can change it and submit it again."
              destructive
              pending={reject.isPending}
              onConfirm={(reason, close) => reject.mutate({ id: order.id, reason }, { onSuccess: close })}
            />
          )}
          {!isCancelled(status) && status !== "completed" && !goodsReceived && can("PURCHASE_ORDERS.CANCEL") && (
            <ReasonButton
              icon={BanIcon}
              label="Cancel PO"
              title={`Cancel ${number}?`}
              description={`Internal requisition ${irNumber} and an open GRN are cancelled too, with the same reason. This can't be undone.`}
              destructive
              pending={cancel.isPending}
              onConfirm={(reason, close) => cancel.mutate({ id: order.id, reason }, { onSuccess: close })}
            />
          )}
          {isEditable(status) && can("PURCHASE_ORDERS.EDIT") && (
            <TopBarButton to={`/purchase-orders/${order.id}/edit`} icon={PencilIcon} label={status === "rejected" ? "Edit & resubmit" : "Edit"} />
          )}
          {/* The printed PO says who approved it, so it's there once approved, as in the old system. */}
          {isPrintable(status) && (
            <PdfButtons
              fileName={`${order.purchaseOrderNumber}.pdf`}
              document={() =>
                import("./PurchaseOrderDocument").then((module) =>
                  <module.PurchaseOrderDocument order={order} countryName={countryName(order.supplier.country)} />,
                )
              }
            />
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

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Image</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.lineNo}</TableCell>
                <TableCell>{item.product.sku}</TableCell>
                <TableCell className="whitespace-normal">{item.product.title}</TableCell>
                <TableCell>
                  <ProductThumbnail src={item.product.imageUrl} alt={item.product.title} />
                </TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">{format.money(item.unitPrice)}</TableCell>
                <TableCell className="text-right">{discountLabel(item, format.money)}</TableCell>
                <TableCell className="text-right">{format.money(item.subtotal - item.discountAmount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            {totals.map(([label, value]) => (
              <TableRow key={label}>
                <TableCell colSpan={7} className="text-right text-muted-foreground">
                  {label}
                </TableCell>
                <TableCell className="text-right">{format.money(value)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={7} className="text-right font-semibold">
                Total
              </TableCell>
              <TableCell className="text-right font-semibold">{format.money(order.grandTotal)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>

        {showsReceipt && <OrderReceiptSection internalRequisitionId={order.internalRequisitionId} />}

        <ApprovalHistory approvals={order.approvals} />
      </div>
    </div>
  )
}
