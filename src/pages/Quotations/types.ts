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

// Mirrors QuotationType in GP-ERP-Server/prisma/schema.prisma. Service and warranty quotations carry references to
// what they're about (TYPE_FIELDS); the server rejects a field that isn't its type's.
export type QuotationType = "sales" | "service" | "warranty"

export const typeLabels: Record<QuotationType, string> = { sales: "Sales", service: "Service", warranty: "Warranty" }

// oldInvoiceId and oldSerialItemId are links, picked in ReferenceLinks.tsx (the server copies their numbers).
// NOT BUILT YET: repairReceiveNoteId and troubleshootId are ids from modules that don't exist (Repairs, Troubleshoots),
// so the form's selects for them have no options and they stay null. When a module is built, give its select options
// in QuotationForm (CreateQuotationPage.tsx). productModel is plain text the user types, by design.
export type TypeField = "repairReceiveNoteId" | "troubleshootId" | "oldInvoiceId" | "oldSerialItemId" | "productModel"

export const typeFieldLabels: Record<TypeField, string> = {
  repairReceiveNoteId: "Repair received note",
  troubleshootId: "Troubleshoot",
  oldInvoiceId: "Old invoice",
  oldSerialItemId: "Old serial number",
  productModel: "Product model",
}

// The fields each type has, in form order. Same as FIELDS_OF_TYPE in the server's quotations.types.ts.
export const fieldsOfType: Record<QuotationType, TypeField[]> = {
  sales: [],
  service: ["repairReceiveNoteId", "oldInvoiceId", "oldSerialItemId"],
  warranty: ["troubleshootId", "oldInvoiceId", "oldSerialItemId", "productModel"],
}

// What a type field shows: the links show their number.
export function typeFieldText(
  document: Record<Exclude<TypeField, "oldInvoiceId" | "oldSerialItemId">, string | null> & {
    oldInvoiceNumber: string | null
    oldSerialNumber: string | null
  },
  field: TypeField,
): string | null {
  if (field === "oldInvoiceId") return document.oldInvoiceNumber
  if (field === "oldSerialItemId") return document.oldSerialNumber
  return document[field]
}

// How the customer pays. Optional on every type.
export type PaymentTerms = "cashOnDelivery" | "advancePayment"

export const paymentTermsLabels: Record<PaymentTerms, string> = {
  cashOnDelivery: "Cash on Delivery",
  advancePayment: "Advance Payment",
}

// The statuses a user can set.
export type SettableStatus = Extract<QuotationStatus, "active" | "cancelled" | "creditConfirmed" | "paymentConfirmed">

export const isCancelled = (status: QuotationStatus) =>
  status === "cancelled" || status === "cancelledAfterCredit" || status === "cancelledAfterPayment"


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
  // "GPQ-0000001": set by the server, shown wherever the quotation is named. Use this, never the id.
  quotationNumber: string
  customerId: string
  customer: { id: string; code: string; name: string }
  salesManagerId: string
  salesManager: SalesManager
  // "2026-11-04"
  quotationDate: string
  validUntil: string | null
  type: QuotationType
  // Only the type's own fields (fieldsOfType) can be set; the rest are null.
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
  // Service quotations only: priced by this charge (VAT at serviceTaxRate %) instead of product lines.
  serviceCharge: number | null
  serviceTaxRate: number | null
  // Sales quotations only.
  isPreOrdered: boolean
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
  type: QuotationType
  repairReceiveNoteId: string | null
  troubleshootId: string | null
  // Ids; the server copies the numbers.
  oldInvoiceId: number | null
  oldSerialItemId: number | null
  productModel: string | null
  paymentTerms: PaymentTerms | null
  deliveryLocation: string | null
  // Required on service quotations, which have no items; null on the others, which need at least one item.
  serviceCharge: number | null
  isPreOrdered: boolean
  items: QuotationItemInput[]
}

// `items` replaces every line. Only an active quotation can change anything but its status and isDeleted.
export type QuotationUpdate = Partial<NewQuotation & { status: SettableStatus; isDeleted: boolean }> & { id: number }
