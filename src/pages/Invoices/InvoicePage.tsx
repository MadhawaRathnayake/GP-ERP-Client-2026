import { BanIcon, CheckIcon, PencilIcon, ScanBarcodeIcon } from "lucide-react"
import { type ReactNode } from "react"
import { Link, useParams } from "react-router-dom"

import { useCan } from "@/app/auth"
import { useFormat, useSettings } from "@/app/settings"
import { DetailSkeleton } from "@/components/DetailCard"
import { QueryError } from "@/components/StatusView"
import { TopBarActions } from "@/components/TopBarActions"
import { BackButton, PdfButtons, TopBarButton } from "@/components/TopBarButton"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { HOME_COUNTRY, useCountryName } from "@/pages/Countries/api"
import { ProductThumbnail } from "@/pages/Quotations/ProductPickerDialog"
import { ConfirmButton } from "@/pages/Quotations/QuotationPage"
import { fieldsOfType, paymentTermsLabels, typeFieldLabels, typeFieldText, typeLabels } from "@/pages/Quotations/types"
import { DeliveryNoteStatusLabel } from "@/pages/DeliveryNotes/DeliveryNotesPage"

import { useCancelInvoice, useFinalizeInvoice, useInvoice } from "./api"
import { InvoiceProgress, InvoiceStatusLabel } from "./InvoicesPage"
import { invoiceNumberOf, isCancelled, paymentMethodLabels, serialProgress, type Invoice } from "./types"

export function InvoicePage() {
  const countryName = useCountryName()
  const { data: settings } = useSettings()
  const { id = "" } = useParams()
  const can = useCan()
  const format = useFormat()
  const { data: invoice, isPending, isError, error } = useInvoice(id)
  const finalizeInvoice = useFinalizeInvoice()
  const cancelInvoice = useCancelInvoice()

  if (isPending || isError) {
    return (
      <div className="mx-auto max-w-6xl">
        <TopBarActions>
          <BackButton to="/invoices" label="Invoices" />
        </TopBarActions>
        {isPending ? <DetailSkeleton label="Loading invoice" /> : <QueryError error={error} />}
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

  const { customer } = invoice
  const address = [customer.houseNumber, customer.street, customer.city, customer.district].filter(Boolean).join(", ")
  const invoicedOn = (invoice.finalizedAt ?? invoice.createdAt).slice(0, 10)
  const isVatApplicable = invoicedOn >= VAT_FROM
  const info: [string, string][] = [
    ["Invoice No", invoice.invoiceNumber ?? `${invoice.draftNumber} (draft)`],
    ["Date", format.date(invoice.finalizedAt ?? invoice.createdAt)],
    ["Due Date", format.date(invoice.dueDate)],
    ["Sales Person", invoice.salesManager.name],
    ["Payment Terms", invoice.paymentTerms ? paymentTermsLabels[invoice.paymentTerms] : "-"],
    ...(invoice.paymentMethod
      ? ([
          [
            "Payment Method",
            `${paymentMethodLabels[invoice.paymentMethod]}${invoice.paymentDetails ? ` (${invoice.paymentDetails})` : ""}`,
          ],
        ] satisfies [string, string][])
      : []),
    ["Customer Code", customer.code],
    ...(quotation ? ([["Quotation No", quotation.quotationNumber]] satisfies [string, string][]) : []),
  ]
  const vatRate = invoice.items[0]?.taxRate ?? invoice.serviceTaxRate ?? 0
  // As on the printed invoice: the subtotal is after discounts, before VAT. With the quotation's figure to compare.
  const sheetTotals: [string, number, number | undefined][] =
    invoice.type === "service"
      ? [
          ["Service Charge", invoice.serviceCharge ?? 0, quotation?.serviceCharge ?? undefined],
          [`${vatRate}% VAT`, invoice.taxTotal, undefined],
        ]
      : [
          ["Subtotal", invoice.subtotal - invoice.discountTotal, undefined],
          [`${vatRate}% VAT`, invoice.taxTotal, undefined],
        ]
  // A service invoice has nothing to deliver, so finalizing it makes no delivery note.
  const makesDeliveryNote = invoice.type !== "service"
  const finalizeLabel = makesDeliveryNote ? "Finalize & create delivery note" : "Finalize"
  const quotationLine = (productId: string) => quotation?.items.find((line) => line.productId === productId)
  // Finalizing needs a scanned serial for every unit of the serial-tracked lines (the warehouse does it).
  const serialLines = serialProgress(invoice)
  const unscanned = serialLines.reduce((total, line) => total + line.item.quantity - line.picks.length, 0)

  // The printed date: the day it was finalized (a draft: the day it was made), in the company's timezone.
  const invoiceDate = new Intl.DateTimeFormat("en-US", {
    timeZone: settings?.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(invoice.finalizedAt ?? invoice.createdAt))

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <TopBarActions>
        <BackButton to="/invoices" label="Invoices" />
        {isDraft && serialLines.length > 0 && can("INVOICES.ADD_SERIALS") && (
          <TopBarButton
            tone={unscanned > 0 ? "main" : "soft"}
            to={`/invoices/${invoice.id}/serials`}
            icon={ScanBarcodeIcon}
            label={unscanned > 0 ? `Scan serial numbers (${unscanned} to go)` : "Serial numbers"}
          />
        )}
        {isDraft && can("INVOICES.FINALIZE") && unscanned > 0 && (
          <TopBarButton tone="main" icon={CheckIcon} label={finalizeLabel} disabled title="Every unit of the serial-numbered lines needs its serial scanned first" />
        )}
        {isDraft && can("INVOICES.FINALIZE") && unscanned === 0 && (
          <ConfirmButton
            icon={CheckIcon}
            label={finalizeLabel}
            primary
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
            icon={BanIcon}
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
          <TopBarButton to={`/invoices/${invoice.id}/edit`} icon={PencilIcon} label="Edit" />
        )}
        {/* A cancelled invoice has no document to send. */}
        {!isCancelled(status) && (
          <PdfButtons
            fileName={`${invoiceNumberOf(invoice)} ${invoice.customer.name}.pdf`}
            document={() =>
              import("./InvoiceDocument").then((module) =>
                <module.InvoiceDocument invoice={invoice} invoiceDate={invoiceDate} countryName={countryName(invoice.customer.country)} />,
              )
            }
          />
        )}
      </TopBarActions>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isDraft ? "Draft invoice" : "Invoice"} {number}
        </h1>
        <div className="w-full max-w-md">
          <InvoiceProgress invoice={invoice} />
        </div>
      </div>

      {/* The same sheet as the quotation page's, with the invoice's details and the quotation's figures where they
          differ. */}
      <Card className="gap-0 overflow-hidden py-0 shadow-card">
        {/* A thin band across the top of the sheet, in the status's colour. */}
        <div className={cn("h-1.5", statusBand[status])} />
        <div className="flex flex-col gap-6 p-5 text-sm sm:p-8">
          {/* Letterhead: the logo, the company on the left, the invoice's details on the right. */}
          <img src="/document-logo.png" alt="Gunda Power" className="w-48 sm:w-60" />
          <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
            <div className="space-y-5">
              <address className="text-xs leading-relaxed not-italic text-muted-foreground">
                {sender.address}
                <br />
                {sender.city}
                {isVatApplicable && (
                  <>
                    <br />
                    {sender.vatRegistration}
                    <br />
                    {sender.tin}
                  </>
                )}
                <br />
                {sender.tel}
                <br />
                {sender.web}
              </address>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Bill To:</p>
                <div className="max-w-sm rounded-md border border-foreground/60 px-3 py-2.5 text-xs leading-relaxed">
                  <Link to={`/customers/${customer.id}`} className="font-medium text-primary hover:underline">
                    {customer.name}
                  </Link>
                  {(address || customer.country !== HOME_COUNTRY) && (
                    <p>{[address, customer.country !== HOME_COUNTRY && countryName(customer.country)].filter(Boolean).join(", ")}</p>
                  )}
                  {customer.phones.length > 0 && <p>{customer.phones.join(" / ")}</p>}
                  {customer.email && <p>{customer.email}</p>}
                  {isVatApplicable && customer.vatNumber && <p>VAT No: {customer.vatNumber}</p>}
                </div>
              </div>
            </div>
            <div className="sm:w-64">
              <h2 className="mb-2 text-base font-semibold tracking-wide">INVOICE</h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                {info.map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Lines. Only this table scrolls sideways on a phone. */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-y text-xs">
              <thead className="border-b font-semibold">
                <tr className="[&>th]:px-2 [&>th]:py-3 [&>th]:text-center">
                  <th className="w-10">#</th>
                  <th>Item Description</th>
                  <th>Image</th>
                  <th>Qty.</th>
                  <th>Unit Price</th>
                  <th>Disc.</th>
                  <th>Total Disc.</th>
                  <th className="text-right!">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoice.items.map((item) => {
                  const fromQuotation = quotationLine(item.productId)
                  return (
                    <tr key={item.id} className="[&>td]:px-2 [&>td]:py-3 [&>td]:text-center">
                      <td>{item.lineNo}</td>
                      <td className="leading-relaxed">
                        {item.description}
                        {item.product.description && item.product.description !== item.description && (
                          <span className="block text-muted-foreground">{item.product.description}</span>
                        )}
                        <span className="block text-muted-foreground">{item.product.sku}</span>
                        {quotation && !fromQuotation && <span className="block text-muted-foreground">Not on the quotation</span>}
                        {item.warrantyEndsAt && (
                          <span className="block text-muted-foreground">Warranty until {format.date(item.warrantyEndsAt)}</span>
                        )}
                        {item.product.trackingType === "serial" && (
                          <SerialList
                            picks={invoice.serialPicks.filter((pick) => pick.productId === item.productId)}
                            quantity={item.quantity}
                            showCount={isDraft}
                          />
                        )}
                      </td>
                      <td>
                        <span className="inline-flex justify-center">
                          <ProductThumbnail src={item.product.imageUrl} alt={item.description} />
                        </span>
                      </td>
                      <td className="tabular-nums">
                        {item.quantity}
                        {fromQuotation && fromQuotation.quantity !== item.quantity && (
                          <span className="block text-muted-foreground">Quotation: {fromQuotation.quantity}</span>
                        )}
                      </td>
                      <td className="tabular-nums">
                        {format.money(item.unitPrice)}
                        {quoted(item.unitPrice, fromQuotation?.unitPrice)}
                      </td>
                      <td className="tabular-nums">
                        {item.discountType === "none"
                          ? "-"
                          : item.discountType === "percentage"
                            ? `${item.discountValue}%`
                            : format.money(item.discountValue)}
                      </td>
                      <td className="tabular-nums">{item.discountAmount ? format.money(item.discountAmount) : "-"}</td>
                      <td className="text-right! tabular-nums">{format.money(item.lineTotal - item.taxAmount)}</td>
                    </tr>
                  )
                })}
                {invoice.items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-2 py-4 text-center text-muted-foreground">
                      {invoice.type === "service" ? "Service invoice: priced by its service charge." : "No lines."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <dl className="ml-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-xs">
            {sheetTotals.map(([label, value, quotationValue]) => (
              <div key={label} className="contents">
                <dt className="text-right font-semibold uppercase">{label}</dt>
                <dd className="text-right tabular-nums">
                  {format.money(value)}
                  {quoted(value, quotationValue)}
                </dd>
              </div>
            ))}
            <dt className="border-t pt-2 text-right font-semibold uppercase">Total</dt>
            <dd className="border-t pt-2 text-right font-semibold tabular-nums">
              {format.money(invoice.grandTotal)}
              {quoted(invoice.grandTotal, quotation?.grandTotal)}
            </dd>
          </dl>
        </div>
      </Card>

      {/* What the printed invoice leaves out: for staff. */}
      <Card className="gap-0 p-5 text-sm shadow-card">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {invoice.isImported && <Info label="Source">Imported from the old system (read only)</Info>}
          <Info label="Type">{typeLabels[invoice.type]}</Info>
          {fieldsOfType[invoice.type].map((field) => (
            <Info key={field} label={typeFieldLabels[field]}>
              {typeFieldText(invoice, field)}
            </Info>
          ))}
          <Info label="Quotation">
            {quotation && (
              <Link to={`/quotations/${quotation.id}`} className="text-primary hover:underline">
                {quotation.quotationNumber}
              </Link>
            )}
          </Info>
          <Info label="Draft number">{invoice.draftNumber}</Info>
          <Info label="Status">
            <InvoiceStatusLabel invoice={invoice} />
          </Info>
          <Info label="Delivery location">{invoice.deliveryLocation}</Info>
          {invoice.deliveryNote && (
            <Info label="Delivery note">
              {can("DELIVERY_NOTES.VIEW") ? (
                <Link to={`/delivery-notes/${invoice.deliveryNote.id}`} className="text-primary hover:underline">
                  {invoice.deliveryNote.deliveryNoteNumber}
                </Link>
              ) : (
                invoice.deliveryNote.deliveryNoteNumber
              )}{" "}
              (<DeliveryNoteStatusLabel status={invoice.deliveryNote.status} />)
            </Info>
          )}
          <Info label="Cost of lines">
            {invoice.items.length > 0 ? format.money(invoice.items.reduce((sum, item) => sum + item.unitCost * item.quantity, 0)) : null}
          </Info>
          <Info label="Notes">{invoice.notes}</Info>
          {quotation && <Info label="Quotation created">{format.dateTime(quotation.createdAt)}</Info>}
          <Info label="Created">{when(invoice.createdAt, invoice.creator)}</Info>
          <Info label="Finalized">{when(invoice.finalizedAt, invoice.finalizer)}</Info>
          {isCancelled(status) && <Info label="Cancelled">{when(invoice.cancelledAt, invoice.canceller)}</Info>}
        </dl>
      </Card>

      {isDraft && unscanned > 0 && (
        <p className="text-sm text-destructive">
          {unscanned} unit(s) still need a serial number before the invoice can be finalized.
        </p>
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

// Company details, as hard-coded in the old system; the same as on the quotation page (QuotationClassicView.tsx).
const sender = {
  address: "184, Buthgamuwa Road",
  city: "Rajagiriya, Sri Lanka",
  vatRegistration: "VAT Registration No: 101171507-7000",
  tin: "TIN No: 101171507",
  tel: "0112 805 005 / 0761 399 060 / 0761 399 063",
  web: "info@gundapower.com / www.gundapower.com",
}

// VAT applies from 8 January 2024, as in the old system.
const VAT_FROM = "2024-01-08"

// Same colours as the status progress bar: draft blue, finalized teal, cancelled red.
const statusBand: Record<Invoice["status"], string> = {
  draft: "bg-status-open",
  finalized: "bg-status-done",
  cancelled: "bg-destructive",
  cancelledAfterFinalized: "bg-destructive",
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words whitespace-pre-line">{children || "—"}</dd>
    </div>
  )
}
