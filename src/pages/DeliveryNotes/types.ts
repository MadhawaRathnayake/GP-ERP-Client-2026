import type { QuotationType } from "@/pages/Quotations/types"

// Mirrors DeliveryNoteStatus in GP-ERP-Server/prisma/schema.prisma. A draft is made when a sales or warranty invoice is
// finalized; adding the item verifier, then the item issuer (a different user), issues it. Cancelling the invoice
// cancels its note.
export type DeliveryNoteStatus = "draft" | "issued" | "cancelled"

export const deliveryNoteStatusLabels: Record<DeliveryNoteStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  cancelled: "Cancelled",
}

interface Person {
  id: string
  name: string
}

export interface DeliveryNoteSummary {
  id: number
  // "GPDN-1", "GPDN-2", …
  deliveryNoteNumber: string
  invoiceId: number
  invoice: {
    id: number
    invoiceNumber: string | null
    type: QuotationType
    deliveryLocation: string | null
    finalizedAt: string | null
    customer: Person & { code: string }
  }
  status: DeliveryNoteStatus
  itemVerifierId: string | null
  itemVerifier: Person | null
  itemIssuerId: string | null
  itemIssuer: Person | null
  // When the issuer was added.
  issuedAt: string | null
  createdBy: string | null
  createdAt: string
  modifiedBy: string | null
  modifiedAt: string | null
  isDeleted: boolean
}

// The products are the invoice's lines; the note has none of its own.
export interface DeliveryNote extends Omit<DeliveryNoteSummary, "invoice"> {
  invoice: DeliveryNoteSummary["invoice"] & {
    customer: Person & {
      code: string
      email: string | null
      phones: string[]
      houseNumber: string | null
      street: string | null
      city: string | null
      district: string | null
      country: string
    }
    items: {
      lineNo: number
      productId: string
      description: string
      quantity: number
      product: { sku: string; title: string; imageUrl: string | null }
    }[]
  }
  creator: Person | null
}

// A user offered by the item verifier or item issuer dropdown (Admin → Dropdowns).
export interface DropdownUser {
  id: string
  name: string
}
