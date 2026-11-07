import type {
  DiscountType,
  PaymentTerms,
  QuotationItemInput,
  QuotationStatus,
  QuotationType,
  SalesManager,
} from "@/pages/Quotations/types"

// Mirrors InvoiceStatus in GP-ERP-Server/prisma/schema.prisma. A draft can be edited; finalizing gives it its invoice
// number and moves the stock in hand to in transit; cancelling gives the stock back (finalized only) and the quotation
// its status before it was invoiced. A draft can be cancelled too.
export type InvoiceStatus = "draft" | "finalized" | "cancelled"

export const statusLabels: Record<InvoiceStatus, string> = { draft: "Draft", finalized: "Finalized", cancelled: "Cancelled" }

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
  product: { sku: string; title: string; description: string; imageUrl: string | null; warrantyMonths: number }
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
  oldInvoiceId: string | null
  oldSerialNumberId: string | null
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
  quotation: {
    id: number
    quotationNumber: string
    status: QuotationStatus
    serviceCharge: number | null
    grandTotal: number
    createdAt: string
    items: QuotationLine[]
  } | null
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
  oldInvoiceId: string | null
  oldSerialNumberId: string | null
  productModel: string | null
  paymentTerms: PaymentTerms | null
  deliveryLocation: string | null
}

// Drafts only. `items` replaces every line.
export type InvoiceUpdate = Partial<InvoiceFields> & { id: number }

export const invoiceNumberOf = (invoice: Pick<InvoiceSummary, "invoiceNumber" | "draftNumber">) =>
  invoice.invoiceNumber ?? invoice.draftNumber
