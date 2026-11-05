import { ArrowLeftIcon, BanIcon, CheckIcon, FileTextIcon, PencilIcon, RotateCcwIcon, Trash2Icon, Undo2Icon } from "lucide-react"
import { lazy, Suspense, useState, type ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { useCan, type PermissionKey } from "@/app/auth"
import { useFormat } from "@/app/settings"
import { QueryError } from "@/components/StatusView"
import { Button } from "@/components/ui/button"
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
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { useCreateInvoice, useDeleteQuotation, useQuotation, useUpdateQuotation } from "./api"
import { ProductThumbnail } from "./ProductPickerDialog"
import { QuotationProgress } from "./QuotationsPage"
import {
  fieldsOfType,
  isCancelled,
  paymentTermsLabels,
  quotationNumber,
  typeFieldLabels,
  typeLabels,
  type SettableStatus,
} from "./types"

// The PDF library is large, so it's only downloaded when a quotation is opened.
const QuotationPdf = lazy(() => import("./QuotationDocument").then((module) => ({ default: module.QuotationPdf })))

export function QuotationPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const can = useCan()
  const format = useFormat()
  const { data: quotation, isPending, isError, error } = useQuotation(id)
  const updateQuotation = useUpdateQuotation()
  const deleteQuotation = useDeleteQuotation()
  const createInvoice = useCreateInvoice()

  if (isPending || isError) {
    return (
      <div className="space-y-4">
        <BackLink />
        {isPending ? <p className="text-sm text-muted-foreground">Loading quotation…</p> : <QueryError error={error} />}
      </div>
    )
  }

  const { status, isDeleted } = quotation
  const number = quotationNumber(quotation.id)
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

  const details: [string, ReactNode][] = [
    ["Number", number],
    ["Type", typeLabels[quotation.type]],
    ...fieldsOfType[quotation.type].map((field): [string, ReactNode] => [typeFieldLabels[field], quotation[field] ?? "—"]),
    ["Date", format.date(quotation.quotationDate)],
    ["Valid until", quotation.validUntil ? format.date(quotation.validUntil) : "—"],
    [
      "Customer",
      <Link to={`/customers/${quotation.customerId}`} className="hover:underline">
        {quotation.customer.code} - {quotation.customer.name}
      </Link>,
    ],
    ["Sales manager", quotation.salesManager.name],
    ["Payment terms", quotation.paymentTerms ? paymentTermsLabels[quotation.paymentTerms] : "—"],
    ["Delivery location", <span className="whitespace-pre-line">{quotation.deliveryLocation ?? "—"}</span>],
    ["Terms", <span className="whitespace-pre-line">{quotation.terms ?? "—"}</span>],
    ["Notes", <span className="whitespace-pre-line">{quotation.notes ?? "—"}</span>],
    ...(isDeleted ? [["Deleted", <span className="text-destructive">Yes</span>] satisfies [string, ReactNode]] : []),
    ["Created", format.dateTime(quotation.createdAt)],
    ["Modified", quotation.modifiedAt ? format.dateTime(quotation.modifiedAt) : "—"],
  ]
  const totals: [string, number][] = [
    ["Subtotal", quotation.subtotal],
    ["Discount", -quotation.discountTotal],
    ["VAT", quotation.taxTotal],
  ]
  // The columns before "Line total", for the footer labels.
  const labelSpan = 9

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Quotation {number}</h1>
      <BackLink />
      <div className="space-y-6">
        <div className="max-w-3xl px-2">
          <QuotationProgress status={status} isDeleted={isDeleted} />
        </div>
        <div className="flex flex-wrap gap-2">
          {isConfirmed && !isDeleted && can("INVOICES.CREATE") && (
            <ConfirmButton
              icon={<FileTextIcon />}
              label="Create invoice"
              title={`Create an invoice for ${number}?`}
              description="Invoices this quotation. After that, it can't be changed."
              pending={createInvoice.isPending}
              onConfirm={(close) => createInvoice.mutate(quotation.id, { onSuccess: close })}
            />
          )}
          {canChangeStatus("QUOTATIONS.CONFIRM_PAYMENT") && status === "active" && (
            <ConfirmButton
              icon={<CheckIcon />}
              label="Confirm payment"
              title={`Confirm payment for ${number}?`}
              description="Records that the customer has paid this quotation. It can't be edited after this."
              pending={updateQuotation.isPending}
              onConfirm={setStatus("paymentConfirmed")}
            />
          )}
          {canChangeStatus("QUOTATIONS.CONFIRM_CREDIT") && status === "active" && (
            <ConfirmButton
              icon={<CheckIcon />}
              label="Confirm credit"
              title={`Confirm credit for ${number}?`}
              description="Allows this quotation to go ahead on credit. It can't be edited after this."
              pending={updateQuotation.isPending}
              onConfirm={setStatus("creditConfirmed")}
            />
          )}
          {canChangeStatus("QUOTATIONS.UNDO_CONFIRMATION") && isConfirmed && (
            <ConfirmButton
              icon={<Undo2Icon />}
              label="Undo confirmation"
              title={`Undo the ${status === "paymentConfirmed" ? "payment" : "credit"} confirmation?`}
              description={`${number} goes back to Active and can be edited again.`}
              pending={updateQuotation.isPending}
              onConfirm={setStatus("active")}
            />
          )}
          {canReopen && isCancelled(status) && (
            <ConfirmButton
              icon={<RotateCcwIcon />}
              label="Reopen"
              title={`Reopen ${number}?`}
              description="It goes back to Active and can be edited again."
              pending={updateQuotation.isPending}
              onConfirm={setStatus("active")}
            />
          )}
          {canChangeStatus("QUOTATIONS.CANCEL") && (status === "active" || isConfirmed) && (
            <ConfirmButton
              icon={<BanIcon />}
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
              icon={<Trash2Icon />}
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
            <Button
              variant="outline"
              disabled={updateQuotation.isPending}
              onClick={() => updateQuotation.mutate({ id: quotation.id, isDeleted: false })}
            >
              <RotateCcwIcon />
              Restore
            </Button>
          )}
          {isActive && can("QUOTATIONS.EDIT") && (
            <Button asChild>
              <Link to={`/quotations/${quotation.id}/edit`}>
                <PencilIcon />
                Edit
              </Link>
            </Button>
          )}
        </div>
        <dl className="max-w-3xl border-t">
          {details.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[minmax(8rem,14rem)_1fr] gap-4 border-b px-2 py-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="min-w-0 break-words">{value}</dd>
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
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Unit cost</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead className="text-right">VAT</TableHead>
              <TableHead className="text-right">Line total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotation.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.lineNo}</TableCell>
                <TableCell>{item.product.sku}</TableCell>
                <TableCell className="whitespace-normal">{item.description}</TableCell>
                <TableCell>
                  <ProductThumbnail src={item.product.imageUrl} alt={item.description} />
                </TableCell>
                <TableCell className="text-right">{format.money(item.unitPrice)}</TableCell>
                <TableCell className="text-right">{format.money(item.unitCost)}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
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
            ))}
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
              </TableCell>
              <TableCell className="text-right font-semibold">{format.money(quotation.grandTotal)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* As in the old system, a cancelled quotation has no document to send. Centred across the page, unlike the
          details above. */}
      {!isCancelled(status) && (
        <div className="mx-auto w-full max-w-5xl pt-2">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading the quotation document…</p>}>
            <QuotationPdf quotation={quotation} />
          </Suspense>
        </div>
      )}
    </div>
  )
}

interface ConfirmButtonProps {
  icon: ReactNode
  label: string
  title: string
  description: string
  // Red button and confirm, for cancelling and deleting.
  destructive?: boolean
  pending: boolean
  // Called with a function that closes the dialog, for the mutation's onSuccess.
  onConfirm: (close: () => void) => void
}

function ConfirmButton({ icon, label, title, description, destructive, pending, onConfirm }: ConfirmButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={destructive ? "destructive" : "outline"}>
          {icon}
          {label}
        </Button>
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

function BackLink() {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link to="/quotations">
        <ArrowLeftIcon />
        Back to quotations
      </Link>
    </Button>
  )
}
