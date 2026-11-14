import type { TrackingType } from "@/pages/Products/types"
import type {
  DiscountType,
  PaymentTerms,
  QuotationItemInput,
  QuotationStatus,
  QuotationType,
  SalesManager,
} from "@/pages/Quotations/types"
import type { DeliveryNoteStatus } from "@/pages/DeliveryNotes/types"

// Mirrors InvoiceStatus in GP-ERP-Server/prisma/schema.prisma. A draft can be edited; finalizing gives it its invoice
// number and takes its products out of stock in hand; cancelling gives the stock back (finalized only) and the quotation
// its status before it was invoiced. A cancelled draft is cancelled, a cancelled finalized invoice
// cancelledAfterFinalized.
export type InvoiceStatus = "draft" | "finalized" | "cancelled" | "cancelledAfterFinalized"

export const statusLabels: Record<InvoiceStatus, string> = {
  draft: "Draft",
  finalized: "Finalized",
  cancelled: "Cancelled",
  cancelledAfterFinalized: "Cancelled after finalized",
}

export const isCancelled = (status: InvoiceStatus) => status === "cancelled" || status === "cancelledAfterFinalized"

// Required on sales and service invoices, optional on warranty ones. The labels are the old system's.
export type PaymentMethod = "cash" | "credit" | "cheque" | "bankTransfer"

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  credit: "Credit",
  cheque: "Cheque",
  bankTransfer: "Bank Transfer",
}

// paymentDetails is asked for, and saved, only with these methods.
export const paymentDetailsLabels: Partial<Record<PaymentMethod, string>> = {
  cheque: "Cheque number - bank name",
  bankTransfer: "Bank name",
}

export interface InvoiceItem {
  id: number
  lineNo: number
  productId: string
  product: { sku: string; title: string; description: string; imageUrl: string | null; warrantyMonths: number; trackingType: TrackingType }
  description: string
  quantity: number
  unitPrice: number
  // The product cost when the line was saved, which may differ from the quotation's.
  unitCost: number
  discountType: DiscountType
  discountValue: number
  taxRate: number
  subtotal: number
  discountAmount: number
  taxAmount: number
  lineTotal: number
  // The product's warranty when the line was saved, and when it ends ("YYYY-MM-DD", set on finalize; null before, or
  // without warranty). Warranty starts on the invoice.
  warrantyMonths: number
  warrantyEndsAt: string | null
}

// A unit the warehouse scanned for a serial-tracked line: picked on the draft, sold once finalized.
export interface InvoiceSerialPick {
  productId: string
  serialItem: {
    id: number
    serialNumber: string
    palletNumber: string | null
    accessories: { serialNumber: string; accessory: { name: string } }[]
  }
}

// Each serial-tracked line with how many of its units are scanned. Finalizing needs every one.
export function serialProgress(invoice: Pick<Invoice, "items" | "serialPicks">) {
  return invoice.items
    .filter((item) => item.product.trackingType === "serial")
    .map((item) => ({
      item,
      picks: invoice.serialPicks.filter((pick) => pick.productId === item.productId),
    }))
}

export interface InvoiceSummary {
  id: number
  // "26NOV_GP01_3-draft", given on create.
  draftNumber: string
  // "26NOV_GP01_14", given on finalize. Show invoiceNumberOf(invoice).
  invoiceNumber: string | null
  status: InvoiceStatus
  // null when made without a quotation.
  quotationId: number | null
  quotation: { id: number; quotationNumber: string } | null
  customerId: string
  customer: { id: string; code: string; name: string }
  salesManagerId: string
  salesManager: SalesManager
  // The header is the quotation's: type, references, payment terms and delivery location.
  type: QuotationType
  repairReceiveNoteId: string | null
  troubleshootId: string | null
  // Links to the invoice the item was sold on and the unit itself, with their numbers; an imported quotation may have
  // only the number (old-system text, no link).
  oldInvoiceId: number | null
  oldInvoiceNumber: string | null
  oldSerialItemId: number | null
  oldSerialNumber: string | null
  productModel: string | null
  paymentTerms: PaymentTerms | null
  deliveryLocation: string | null
  paymentMethod: PaymentMethod | null
  paymentDetails: string | null
  // "2026-11-04"
  dueDate: string
  serviceCharge: number | null
  serviceTaxRate: number | null
  subtotal: number
  discountTotal: number
  taxTotal: number
  grandTotal: number
  // Internal, not printed.
  notes: string | null
  finalizedBy: string | null
  finalizedAt: string | null
  cancelledBy: string | null
  cancelledAt: string | null
  // Imported from the old system: read only, it can't be cancelled here (its stock is as the old system left it).
  isImported: boolean
  createdBy: string | null
  createdAt: string
  modifiedBy: string | null
  modifiedAt: string | null
  isDeleted: boolean
}

// The customer as the printed invoice shows it.
export interface InvoiceCustomer {
  id: string
  code: string
  name: string
  email: string | null
  phones: string[]
  houseNumber: string | null
  street: string | null
  city: string | null
  district: string | null
  country: string
  vatNumber: string | null
  tinNumber: string | null
}

// The quotation's own figures for a product, to compare with the invoice's.
export interface QuotationLine {
  productId: string
  quantity: number
  unitPrice: number
  unitCost: number
  discountAmount: number
  lineTotal: number
}

interface Person {
  id: string
  name: string
}

export interface Invoice extends Omit<InvoiceSummary, "customer" | "quotation"> {
  customer: InvoiceCustomer
  items: InvoiceItem[]
  serialPicks: InvoiceSerialPick[]
  quotation: {
    id: number
    quotationNumber: string
    status: QuotationStatus
    serviceCharge: number | null
    grandTotal: number
    createdAt: string
    items: QuotationLine[]
  } | null
  // Made on finalize for sales and warranty invoices; null for drafts, service invoices and ones finalized before
  // delivery notes existed.
  deliveryNote: { id: number; deliveryNoteNumber: string; status: DeliveryNoteStatus } | null
  creator: Person | null
  finalizer: Person | null
  canceller: Person | null
}

// What can change on a draft. The rest comes from the quotation.
export interface InvoiceFields {
  paymentMethod: PaymentMethod | null
  paymentDetails: string | null
  dueDate: string
  notes: string | null
  // Required on service invoices, which have no items; null on the others, which need at least one item.
  serviceCharge: number | null
  items: QuotationItemInput[]
}

export interface NewInvoice extends InvoiceFields {
  quotationId: number
}

// With INVOICES.CREATE_DIRECT: no quotation, so the header is sent.
export interface NewDirectInvoice extends InvoiceFields {
  customerId: string
  salesManagerId: string
  type: QuotationType
  repairReceiveNoteId: string | null
  troubleshootId: string | null
  // Ids; the server copies the numbers.
  oldInvoiceId: number | null
  oldSerialItemId: number | null
  productModel: string | null
  paymentTerms: PaymentTerms | null
  deliveryLocation: string | null
}

// Drafts only. `items` replaces every line.
export type InvoiceUpdate = Partial<InvoiceFields> & { id: number }

export const invoiceNumberOf = (invoice: Pick<InvoiceSummary, "invoiceNumber" | "draftNumber">) =>
  invoice.invoiceNumber ?? invoice.draftNumber
