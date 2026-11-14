import { ArrowLeftIcon, BanIcon, CheckIcon, PencilIcon, ScanBarcodeIcon } from "lucide-react"
import { lazy, Suspense, type ReactNode } from "react"
import { Link, useParams } from "react-router-dom"

import { useCan } from "@/app/auth"
import { useFormat } from "@/app/settings"
import { QueryError } from "@/components/StatusView"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ProductThumbnail } from "@/pages/Quotations/ProductPickerDialog"
import { ConfirmButton } from "@/pages/Quotations/QuotationPage"
import { fieldsOfType, paymentTermsLabels, typeFieldLabels, typeFieldText, typeLabels } from "@/pages/Quotations/types"
import { DeliveryNoteStatusLabel } from "@/pages/DeliveryNotes/DeliveryNotesPage"

import { useCancelInvoice, useFinalizeInvoice, useInvoice } from "./api"
import { InvoiceProgress, InvoiceStatusLabel } from "./InvoicesPage"
import { invoiceNumberOf, isCancelled, paymentMethodLabels, serialProgress, type Invoice } from "./types"

// The PDF library is large, so it's only downloaded when an invoice is opened.
const InvoicePdf = lazy(() => import("./InvoiceDocument").then((module) => ({ default: module.InvoicePdf })))

export function InvoicePage() {
  const { id = "" } = useParams()
  const can = useCan()
  const format = useFormat()
  const { data: invoice, isPending, isError, error } = useInvoice(id)
  const finalizeInvoice = useFinalizeInvoice()
  const cancelInvoice = useCancelInvoice()

  if (isPending || isError) {
    return (
      <div className="space-y-4">
        <TopBarActions>
          <BackLink />
        </TopBarActions>
        {isPending ? <p className="text-sm text-muted-foreground">Loading invoice…</p> : <QueryError error={error} />}
      </div>
    )
  }

  const { status, quotation } = invoice
  const number = invoiceNumberOf(invoice)
  const isDraft = status === "draft"
  // Who did it and when, e.g. "6 Nov 2026, 10:15 by Nimal".
  const when = (at: string | null, by: { name: string } | null) =>
    at ? `${format.dateTime(at)}${by ? ` by ${by.name}` : ""}` : "—"
  // The quotation's figure under the invoice's, when they differ.
  const quoted = (invoiceValue: number, quotationValue: number | undefined) =>
    quotationValue !== undefined && quotationValue !== invoiceValue ? (
      <span className="block text-xs text-muted-foreground">Quotation: {format.money(quotationValue)}</span>
    ) : null

  const details: [string, ReactNode][] = [
    ["Invoice number", invoice.invoiceNumber ?? "— (given on finalize)"],
    ["Draft number", invoice.draftNumber],
    ...(invoice.isImported ? [["Source", "Imported from the old system (read only)"] satisfies [string, ReactNode]] : []),
    ["Status", <InvoiceStatusLabel invoice={invoice} />],
    [
      "Quotation",
      quotation ? (
        <Link to={`/quotations/${quotation.id}`} className="hover:underline">
          {quotation.quotationNumber}
        </Link>
      ) : (
        "— (made without a quotation)"
      ),
    ],
    ["Type", typeLabels[invoice.type]],
    ...fieldsOfType[invoice.type].map((field): [string, ReactNode] => [typeFieldLabels[field], typeFieldText(invoice, field) ?? "—"]),
    [
      "Customer",
      <Link to={`/customers/${invoice.customerId}`} className="hover:underline">
        {invoice.customer.code} - {invoice.customer.name}
      </Link>,
    ],
    ["Sales manager", invoice.salesManager.name],
    ["Payment terms", invoice.paymentTerms ? paymentTermsLabels[invoice.paymentTerms] : "—"],
    ["Delivery location", <span className="whitespace-pre-line">{invoice.deliveryLocation ?? "—"}</span>],
    [
      "Payment method",
      invoice.paymentMethod
        ? `${paymentMethodLabels[invoice.paymentMethod]}${invoice.paymentDetails ? ` (${invoice.paymentDetails})` : ""}`
        : "—",
    ],
    ["Due date", format.date(invoice.dueDate)],
    // A service invoice has no lines, so its amounts are shown here instead of under the lines.
    ...(invoice.type === "service"
      ? ([
          [
            "Service charge",
            <>
              {format.money(invoice.serviceCharge ?? 0)}
              {quoted(invoice.serviceCharge ?? 0, quotation?.serviceCharge ?? undefined)}
            </>,
          ],
          [`VAT (${invoice.serviceTaxRate ?? 0}%)`, format.money(invoice.taxTotal)],
          ["Total", format.money(invoice.grandTotal)],
        ] satisfies [string, ReactNode][])
      : []),
    ["Notes", <span className="whitespace-pre-line">{invoice.notes ?? "—"}</span>],
    ...(quotation ? [["Quotation created", format.dateTime(quotation.createdAt)] satisfies [string, ReactNode]] : []),
    ["Created", when(invoice.createdAt, invoice.creator)],
    ["Finalized", when(invoice.finalizedAt, invoice.finalizer)],
    ...(invoice.deliveryNote
      ? [
          [
            "Delivery note",
            <>
              {can("DELIVERY_NOTES.VIEW") ? (
                <Link to={`/delivery-notes/${invoice.deliveryNote.id}`} className="hover:underline">
                  {invoice.deliveryNote.deliveryNoteNumber}
                </Link>
              ) : (
                invoice.deliveryNote.deliveryNoteNumber
              )}{" "}
              (<DeliveryNoteStatusLabel status={invoice.deliveryNote.status} />)
            </>,
          ] satisfies [string, ReactNode],
        ]
      : []),
    ...(isCancelled(status) ? [["Cancelled", when(invoice.cancelledAt, invoice.canceller)] satisfies [string, ReactNode]] : []),
  ]
  const totals: [string, number][] = [
    ["Subtotal", invoice.subtotal],
    ["Discount", -invoice.discountTotal],
    ["VAT", invoice.taxTotal],
  ]
  // A service invoice has nothing to deliver, so finalizing it makes no delivery note.
  const makesDeliveryNote = invoice.type !== "service"
  const finalizeLabel = makesDeliveryNote ? "Finalize & create delivery note" : "Finalize"
  // The columns before "Line total", for the footer labels.
  const labelSpan = 9
  const quotationLine = (productId: string) => quotation?.items.find((line) => line.productId === productId)
  // Finalizing needs a scanned serial for every unit of the serial-tracked lines (the warehouse does it).
  const serialLines = serialProgress(invoice)
  const unscanned = serialLines.reduce((total, line) => total + line.item.quantity - line.picks.length, 0)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">
        {isDraft ? "Draft invoice" : "Invoice"} {number}
      </h1>
      <div className="space-y-6">
        <div className="max-w-3xl px-2">
          <InvoiceProgress invoice={invoice} />
        </div>
        <TopBarActions>
          <BackLink />
          {isDraft && serialLines.length > 0 && can("INVOICES.ADD_SERIALS") && (
            <Button variant={unscanned > 0 ? "default" : "outline"} asChild>
              <Link to={`/invoices/${invoice.id}/serials`}>
                <ScanBarcodeIcon />
                {unscanned > 0 ? `Scan serial numbers (${unscanned} to go)` : "Serial numbers"}
              </Link>
            </Button>
          )}
          {isDraft && can("INVOICES.FINALIZE") && unscanned > 0 && (
            <Button disabled title="Every unit of the serial-numbered lines needs its serial scanned first">
              <CheckIcon />
              {finalizeLabel}
            </Button>
          )}
          {isDraft && can("INVOICES.FINALIZE") && unscanned === 0 && (
            <ConfirmButton
              icon={<CheckIcon />}
              label={finalizeLabel}
              title={`${finalizeLabel} for ${number}?`}
              description={
                "Gives it its invoice number, takes its products out of stock in hand and starts their warranty. " +
                (makesDeliveryNote ? "It also creates a draft delivery note. " : "") +
                "It can't be edited after this."
              }
              pending={finalizeInvoice.isPending}
              onConfirm={(close) => finalizeInvoice.mutate(invoice.id, { onSuccess: close })}
            />
          )}
          {!isCancelled(status) && !invoice.isImported && can("INVOICES.CANCEL") && (
            <ConfirmButton
              icon={<BanIcon />}
              label="Cancel invoice"
              title={`Cancel ${number}?`}
              description={
                (isDraft ? "" : "Its products go back into stock in hand. ") +
                (invoice.deliveryNote ? `Delivery note ${invoice.deliveryNote.deliveryNoteNumber} is cancelled too. ` : "") +
                (quotation ? `Quotation ${quotation.quotationNumber} goes back to its confirmed status and can be invoiced again. ` : "") +
                "This can't be undone."
              }
              destructive
              pending={cancelInvoice.isPending}
              onConfirm={(close) => cancelInvoice.mutate(invoice.id, { onSuccess: close })}
            />
          )}
          {isDraft && can("INVOICES.EDIT") && (
            <Button asChild>
              <Link to={`/invoices/${invoice.id}/edit`}>
                <PencilIcon />
                Edit
              </Link>
            </Button>
          )}
        </TopBarActions>
        <dl className="max-w-3xl border-t">
          {details.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[minmax(8rem,14rem)_1fr] gap-4 border-b px-2 py-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="min-w-0 break-words">{value}</dd>
            </div>
          ))}
        </dl>

        {invoice.type !== "service" && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Image</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Unit cost</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">VAT</TableHead>
                <TableHead className="text-right">Line total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item) => {
                const fromQuotation = quotationLine(item.productId)
                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.lineNo}</TableCell>
                    <TableCell>{item.product.sku}</TableCell>
                    <TableCell className="whitespace-normal">
                      {item.description}
                      {quotation && !fromQuotation && <span className="block text-xs text-muted-foreground">Not on the quotation</span>}
                      {item.warrantyEndsAt && (
                        <span className="block text-xs text-muted-foreground">Warranty until {format.date(item.warrantyEndsAt)}</span>
                      )}
                      {item.product.trackingType === "serial" && (
                        <SerialList
                          picks={invoice.serialPicks.filter((pick) => pick.productId === item.productId)}
                          quantity={item.quantity}
                          showCount={isDraft}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <ProductThumbnail src={item.product.imageUrl} alt={item.description} />
                    </TableCell>
                    <TableCell className="text-right">
                      {format.money(item.unitPrice)}
                      {quoted(item.unitPrice, fromQuotation?.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      {format.money(item.unitCost)}
                      {quoted(item.unitCost, fromQuotation?.unitCost)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                      {fromQuotation && fromQuotation.quantity !== item.quantity && (
                        <span className="block text-xs text-muted-foreground">Quotation: {fromQuotation.quantity}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.discountType === "none"
                        ? "—"
                        : item.discountType === "percentage"
                          ? `${item.discountValue}%`
                          : format.money(item.discountAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {format.money(item.taxAmount)} <span className="text-muted-foreground">({item.taxRate}%)</span>
                    </TableCell>
                    <TableCell className="text-right">{format.money(item.lineTotal)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
            <TableFooter>
              {totals.map(([label, value]) => (
                <TableRow key={label}>
                  <TableCell colSpan={labelSpan} className="text-right">
                    {label}
                  </TableCell>
                  <TableCell className="text-right">{format.money(value)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={labelSpan} className="text-right font-semibold">
                  Total
                  {quotation && quotation.grandTotal !== invoice.grandTotal && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      Quotation total: {format.money(quotation.grandTotal)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold">{format.money(invoice.grandTotal)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </div>

      {isDraft && unscanned > 0 && (
        <p className="text-sm text-destructive">
          {unscanned} unit(s) still need a serial number before the invoice can be finalized.
        </p>
      )}

      {/* A cancelled invoice has no document to send. */}
      {!isCancelled(status) && (
        <div className="mx-auto w-full max-w-5xl pt-2">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading the invoice document…</p>}>
            <InvoicePdf invoice={invoice} />
          </Suspense>
        </div>
      )}
    </div>
  )
}

// The serials of a line's units (and their accessories'), with "n / quantity scanned" on a draft.
function SerialList({ picks, quantity, showCount }: { picks: Invoice["serialPicks"]; quantity: number; showCount: boolean }) {
  return (
    <span className="mt-1 block text-xs">
      {showCount && (
        <span className={picks.length < quantity ? "text-destructive" : "text-muted-foreground"}>
          {picks.length} / {quantity} serial(s) scanned
          {picks.length > 0 && ": "}
        </span>
      )}
      <span className="font-mono">
        {picks
          .map(({ serialItem }) =>
            [serialItem.serialNumber, ...serialItem.accessories.map((accessory) => `${accessory.accessory.name} ${accessory.serialNumber}`)].join(" · "),
          )
          .join(", ")}
      </span>
    </span>
  )
}

function BackLink() {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link to="/invoices">
        <ArrowLeftIcon />
        Back to invoices
      </Link>
    </Button>
  )
}
