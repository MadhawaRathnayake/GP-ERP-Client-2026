// Mirrors QuotationStatus in GP-ERP-Server/prisma/schema.prisma. Every saved quotation is active; users move it to
// cancelled, creditConfirmed or paymentConfirmed and back. Cancelling a confirmed one makes the server store
// cancelledAfterCredit / cancelledAfterPayment. invoiceCreated is set by invoicing and locks it.
// The rest are reserved by the server and not used yet.
export type QuotationStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "active"
  | "accepted"
  | "declined"
  | "expired"
  | "cancelled"
  | "cancelledAfterCredit"
  | "cancelledAfterPayment"
  | "creditConfirmed"
  | "paymentConfirmed"
  | "invoiceCreated"

// The statuses a user can set.
export type SettableStatus = Extract<QuotationStatus, "active" | "cancelled" | "creditConfirmed" | "paymentConfirmed">

export const isCancelled = (status: QuotationStatus) =>
  status === "cancelled" || status === "cancelledAfterCredit" || status === "cancelledAfterPayment"

/** "GPQ-12": the old system's quotation number format, shown everywhere a quotation is named. */
export const quotationNumber = (id: number) => `GPQ-${id}`

// percentage = % of the line subtotal; fixed = an amount off the whole line, not per unit.
export type DiscountType = "none" | "percentage" | "fixed"

// A user the sales manager dropdown offers (chosen in Admin → Dropdowns).
export interface SalesManager {
  id: string
  name: string
}

export interface QuotationItem {
  id: number
  lineNo: number
  productId: string
  // description is the product's own ("N/A" when it has none); imageUrl is shown on the printed quotation.
  product: { sku: string; description: string; imageUrl: string | null }
  // The product title when the line was saved, unless one was typed.
  description: string
  quantity: number
  unitPrice: number
  // The product cost when the line was saved.
  unitCost: number
  discountType: DiscountType
  discountValue: number
  // VAT percent from the settings when the line was saved.
  taxRate: number
  // Calculated by the server: subtotal = quantity × unitPrice; the discount comes off it, then VAT is added.
  subtotal: number
  discountAmount: number
  taxAmount: number
  lineTotal: number
}

// A row of the quotations list: no lines.
export interface QuotationSummary {
  id: number
  customerId: string
  customer: { id: string; code: string; name: string }
  salesManagerId: string
  salesManager: SalesManager
  // "2026-11-04"
  quotationDate: string
  validUntil: string | null
  status: QuotationStatus
  // The sums of the lines, calculated by the server.
  subtotal: number
  discountTotal: number
  taxTotal: number
  grandTotal: number
  // notes are internal; terms are for the customer.
  notes: string | null
  terms: string | null
  createdBy: string | null
  createdAt: string
  modifiedBy: string | null
  modifiedAt: string | null
  // true = deleted; it can be restored.
  isDeleted: boolean
}

// The customer as the printed quotation shows it ("Bill To").
export interface DocumentCustomer {
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
  contactPerson: string | null
  contactPhones: string[]
  vatNumber: string | null
}

export interface Quotation extends Omit<QuotationSummary, "customer"> {
  customer: DocumentCustomer
  items: QuotationItem[]
}

// What the form sends for a line. Leave unitPrice out to use the product's price; the server works out the rest.
export type QuotationItemInput = Pick<QuotationItem, "productId" | "description" | "quantity" | "discountType" | "discountValue"> & {
  unitPrice?: number
}

export interface NewQuotation {
  customerId: string
  salesManagerId: string
  quotationDate: string
  validUntil: string | null
  notes: string | null
  terms: string | null
  items: QuotationItemInput[]
}

// `items` replaces every line. Only an active quotation can change anything but its status and isDeleted.
export type QuotationUpdate = Partial<NewQuotation & { status: SettableStatus; isDeleted: boolean }> & { id: number }
