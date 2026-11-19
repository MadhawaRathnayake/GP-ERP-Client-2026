import {
  BanIcon,
  CheckIcon,
  FileTextIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
  Undo2Icon,
  type LucideIcon,
} from "lucide-react"
import { useState, type ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { useCan, type PermissionKey } from "@/app/auth"
import { useFormat } from "@/app/settings"
import { DetailSkeleton } from "@/components/DetailCard"
import { QueryError } from "@/components/StatusView"
import { TopBarActions } from "@/components/TopBarActions"
import { BackButton, PdfButtons, TopBarButton } from "@/components/TopBarButton"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { HOME_COUNTRY, useCountryName } from "@/pages/Countries/api"
import { useQuotationInvoices } from "@/pages/Invoices/api"
import { invoiceNumberOf, statusLabels as invoiceStatusLabels, type InvoiceSummary } from "@/pages/Invoices/types"

import { useDeleteQuotation, useQuotation, useUpdateQuotation } from "./api"
import { ProductThumbnail } from "@/pages/Products/ProductPicker"
import { QuotationProgress } from "./QuotationsPage"
import {
  fieldsOfType,
  isCancelled,
  paymentTermsLabels,
  typeFieldLabels,
  typeFieldText,
  typeLabels,
  type Quotation,
  type QuotationStatus,
  type SettableStatus,
} from "./types"

export function QuotationPage() {
  const countryName = useCountryName()
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const can = useCan()
  const { data: quotation, isPending, isError, error } = useQuotation(id)
  const updateQuotation = useUpdateQuotation()
  const deleteQuotation = useDeleteQuotation()
  // Its invoices (at most one that isn't cancelled), linked from the details.
  const invoices = useQuotationInvoices(Number(id), can("INVOICES.VIEW"))

  if (isPending || isError) {
    return (
      <div className="mx-auto max-w-6xl">
        <TopBarActions>
          <BackButton to="/quotations" label="Quotations" />
        </TopBarActions>
        {isPending ? <DetailSkeleton label="Loading quotation" /> : <QueryError error={error} />}
      </div>
    )
  }

  const { status, isDeleted } = quotation
  const number = quotation.quotationNumber
  const isActive = status === "active" && !isDeleted
  const isConfirmed = status === "paymentConfirmed" || status === "creditConfirmed"
  // Each status change has its own permission, as the server checks. Once invoiced nothing can change; a deleted
  // quotation has to be restored first.
  const canChangeStatus = (permission: PermissionKey) => can(permission) && status !== "invoiceCreated" && !isDeleted
  // Reopening a quotation cancelled after a confirmation also undoes that confirmation.
  const canReopen =
    canChangeStatus("QUOTATIONS.REOPEN") && (status === "cancelled" || can("QUOTATIONS.UNDO_CONFIRMATION"))
  const setStatus = (next: SettableStatus) => (close: () => void) =>
    updateQuotation.mutate({ id: quotation.id, status: next }, { onSuccess: close })

  return (
    <div className="space-y-5">
      <TopBarActions>
        <BackButton to="/quotations" label="Quotations" />
        {/* Opens the invoice form filled from this quotation; saving it makes a draft invoice and locks the quotation. */}
        {isConfirmed && !isDeleted && can("INVOICES.CREATE") && (
          <TopBarButton tone="main" to={`/invoices/create?quotationId=${quotation.id}`} icon={FileTextIcon} label="Create invoice" />
        )}
        {canChangeStatus("QUOTATIONS.CONFIRM_PAYMENT") && status === "active" && (
          <ConfirmButton
            icon={CheckIcon}
            label="Confirm payment"
            primary
            title={`Confirm payment for ${number}?`}
            description="Records that the customer has paid this quotation. It can't be edited after this."
            pending={updateQuotation.isPending}
            onConfirm={setStatus("paymentConfirmed")}
          />
        )}
        {canChangeStatus("QUOTATIONS.CONFIRM_CREDIT") && status === "active" && (
          <ConfirmButton
            icon={CheckIcon}
            label="Confirm credit"
            primary
            title={`Confirm credit for ${number}?`}
            description="Allows this quotation to go ahead on credit. It can't be edited after this."
            pending={updateQuotation.isPending}
            onConfirm={setStatus("creditConfirmed")}
          />
        )}
        {canChangeStatus("QUOTATIONS.UNDO_CONFIRMATION") && isConfirmed && (
          <ConfirmButton
            icon={Undo2Icon}
            label="Undo confirmation"
            title={`Undo the ${status === "paymentConfirmed" ? "payment" : "credit"} confirmation?`}
            description={`${number} goes back to Active and can be edited again.`}
            pending={updateQuotation.isPending}
            onConfirm={setStatus("active")}
          />
        )}
        {canReopen && isCancelled(status) && (
          <ConfirmButton
            icon={RotateCcwIcon}
            label="Reopen"
            title={`Reopen ${number}?`}
            description="It goes back to Active and can be edited again."
            pending={updateQuotation.isPending}
            onConfirm={setStatus("active")}
          />
        )}
        {canChangeStatus("QUOTATIONS.CANCEL") && (status === "active" || isConfirmed) && (
          <ConfirmButton
            icon={BanIcon}
            label="Cancel quotation"
            title={`Cancel ${number}?`}
            description="It stays in the list as Cancelled. You can reopen it later."
            destructive
            pending={updateQuotation.isPending}
            onConfirm={setStatus("cancelled")}
          />
        )}
        {isActive && can("QUOTATIONS.DELETE") && (
          <ConfirmButton
            icon={Trash2Icon}
            label="Delete"
            title={`Delete ${number}?`}
            description="It is hidden from the quotations list and keeps its lines. You can restore it from this page."
            destructive
            pending={deleteQuotation.isPending}
            onConfirm={() =>
              deleteQuotation.mutate(quotation.id, { onSuccess: () => navigate("/quotations", { replace: true }) })
            }
          />
        )}
        {isDeleted && can("QUOTATIONS.RESTORE") && (
          <TopBarButton
            icon={RotateCcwIcon}
            label="Restore"
            disabled={updateQuotation.isPending}
            onClick={() => updateQuotation.mutate({ id: quotation.id, isDeleted: false })}
          />
        )}
        {isActive && can("QUOTATIONS.EDIT") && (
          <TopBarButton to={`/quotations/${quotation.id}/edit`} icon={PencilIcon} label="Edit" />
        )}
        {/* As in the old system, a cancelled quotation has no document to send. */}
        {!isCancelled(status) && (
          <PdfButtons
            fileName={`${number} ${quotation.customer.name}.pdf`}
            document={() =>
              import("./QuotationDocument").then((module) =>
                <module.QuotationDocument quotation={quotation} countryName={countryName(quotation.customer.country)} />,
              )
            }
          />
        )}
      </TopBarActions>
      <QuotationSheet quotation={quotation} invoices={invoices.data ?? []} />
    </div>
  )
}

interface ConfirmButtonProps {
  icon: LucideIcon
  label: string
  title: string
  description: string
  // Red button and confirm, for cancelling and deleting.
  destructive?: boolean
  // Filled: the page's main next step (approve, confirm, finalize).
  primary?: boolean
  pending: boolean
  // Called with a function that closes the dialog, for the mutation's onSuccess.
  onConfirm: (close: () => void) => void
}

// Also used on the invoice page.
export function ConfirmButton({ icon, label, title, description, destructive, primary, pending, onConfirm }: ConfirmButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <TopBarButton icon={icon} label={label} tone={primary ? "main" : destructive ? "danger" : "soft"} />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Back</Button>
          </DialogClose>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={() => onConfirm(() => setOpen(false))}
          >
            {pending ? "Saving…" : label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Company details, as hard-coded in the old system; the same as in QuotationDocument.tsx (not imported from there:
// that file loads the PDF library).
const sender = {
  address: "184, Buthgamuwa Road",
  city: "Rajagiriya, Sri Lanka",
  vatRegistration: "VAT Registration No: 101171507-7000",
  tin: "TIN No: 101171507",
  tel: "0112 805 005 / 0761 399 060 / 0761 399 063",
  web: "info@gundapower.com / www.gundapower.com",
}

// VAT applies to quotations dated from 8 January 2024, as in the old system.
const VAT_FROM = "2024-01-08"

// The page's body: the old system's quotation screen, laid out like the printed quotation.
function QuotationSheet({ quotation, invoices }: { quotation: Quotation; invoices: InvoiceSummary[] }) {
  const format = useFormat()
  const countryName = useCountryName()
  const { customer, items } = quotation
  const isVatApplicable = quotation.quotationDate >= VAT_FROM
  const vatRate = items[0]?.taxRate ?? quotation.serviceTaxRate ?? 0
  const address = [customer.houseNumber, customer.street, customer.city, customer.district].filter(Boolean).join(", ")
  const typeFields = fieldsOfType[quotation.type]
    .map((field) => [typeFieldLabels[field], typeFieldText(quotation, field)] as const)
    .filter(([, value]) => value)

  const info: [string, string][] = [
    ["Quotation No", quotation.quotationNumber],
    ["Date", format.date(quotation.quotationDate)],
    ...(quotation.validUntil ? ([["Valid Until", format.date(quotation.validUntil)]] satisfies [string, string][]) : []),
    ["Sales Person", quotation.salesManager.name],
    ["Payment Terms", quotation.paymentTerms ? paymentTermsLabels[quotation.paymentTerms] : "-"],
    ["Customer Code", customer.code],
  ]
  // The old screen's Subtotal is the lines after their discounts, before VAT.
  const totals: [string, number][] =
    quotation.type === "service"
      ? [
          ["Service Charge", quotation.serviceCharge ?? 0],
          [`${vatRate}% VAT`, quotation.taxTotal],
        ]
      : [
          ["Subtotal", quotation.subtotal - quotation.discountTotal],
          [`${vatRate}% VAT`, quotation.taxTotal],
        ]

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Quotation {quotation.quotationNumber}
          {quotation.isPreOrdered && <span className="text-primary"> (Pre-order)</span>}
        </h1>
        <div className="w-full max-w-md">
          <QuotationProgress status={quotation.status} isDeleted={quotation.isDeleted} />
        </div>
      </div>

      <Card className="gap-0 overflow-hidden py-0 shadow-card">
        {/* A thin band across the top of the sheet, in the status's colour. */}
        <div className={cn("h-1.5", quotation.isDeleted ? "bg-muted-foreground/40" : statusBand(quotation.status))} />
        <div className="flex flex-col gap-6 p-5 text-sm sm:p-8">
          {/* Letterhead: the logo, the company on the left, the quotation's details on the right. */}
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
                  {customer.contactPerson && (
                    <p>
                      {customer.contactPerson}
                      {customer.contactPhones.length > 0 && ` · ${customer.contactPhones.join(" / ")}`}
                    </p>
                  )}
                  {isVatApplicable && customer.vatNumber && <p>VAT No: {customer.vatNumber}</p>}
                </div>
              </div>
            </div>
            <div className="sm:w-64">
              <h2 className="mb-2 text-base font-semibold tracking-wide">QUOTATION</h2>
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

          {/* Lines, as on the printed quotation. Only this table scrolls sideways on a phone. */}
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
                {items.map((item) => (
                  <tr key={item.id} className="[&>td]:px-2 [&>td]:py-3 [&>td]:text-center">
                    <td>{item.lineNo}</td>
                    <td className="leading-relaxed">
                      {item.description}
                      {item.product.description && item.product.description !== item.description && (
                        <span className="block text-muted-foreground">{item.product.description}</span>
                      )}
                      <span className="block text-muted-foreground">{item.product.sku}</span>
                    </td>
                    <td>
                      <span className="inline-flex justify-center">
                        <ProductThumbnail src={item.product.imageUrl} alt={item.description} />
                      </span>
                    </td>
                    <td className="tabular-nums">{item.quantity}</td>
                    <td className="tabular-nums">{format.money(item.unitPrice)}</td>
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
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-2 py-4 text-center text-muted-foreground">
                      {quotation.type === "service" ? "Service quotation: priced by its service charge." : "No lines."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <dl className="ml-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-xs">
            {totals.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-right font-semibold uppercase">{label}</dt>
                <dd className="text-right tabular-nums">{format.money(value)}</dd>
              </div>
            ))}
            <dt className="border-t pt-2 text-right font-semibold uppercase">Total</dt>
            <dd className="border-t pt-2 text-right font-semibold tabular-nums">{format.money(quotation.grandTotal)}</dd>
          </dl>
        </div>
      </Card>

      {/* What the printed quotation leaves out: for staff. */}
      <Card className="gap-0 p-5 text-sm shadow-card">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Type">{typeLabels[quotation.type]}</Info>
          {typeFields.map(([label, value]) => (
            <Info key={label} label={label}>
              {value}
            </Info>
          ))}
          <Info label="Delivery location">{quotation.deliveryLocation}</Info>
          {invoices.length > 0 && (
            <Info label="Invoices">
              {invoices.map((invoice) => (
                <Link key={invoice.id} to={`/invoices/${invoice.id}`} className="mr-3 text-primary hover:underline">
                  {invoiceNumberOf(invoice)} ({invoiceStatusLabels[invoice.status]})
                </Link>
              ))}
            </Info>
          )}
          <Info label="Terms">{quotation.terms}</Info>
          <Info label="Notes">{quotation.notes}</Info>
          <Info label="Created">{format.dateTime(quotation.createdAt)}</Info>
          <Info label="Modified">{quotation.modifiedAt && format.dateTime(quotation.modifiedAt)}</Info>
        </dl>
      </Card>
    </div>
  )
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words whitespace-pre-line">{children || "-"}</dd>
    </div>
  )
}

// Same colours as the status progress bar: open blue, confirmed green, invoiced teal, cancelled red.
function statusBand(status: QuotationStatus) {
  if (isCancelled(status)) return "bg-destructive"
  if (status === "paymentConfirmed" || status === "creditConfirmed") return "bg-status-confirmed"
  if (status === "invoiceCreated") return "bg-status-done"
  if (status === "active") return "bg-status-open"
  return "bg-muted-foreground/40"
}
