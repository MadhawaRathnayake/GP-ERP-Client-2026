// Mirrors InternalRequisitionStatus in GP-ERP-Server/prisma/schema.prisma. Saving makes it pending (or approved at once
// when Admin → Approvals turns approval off); a pending one is approved or rejected, and editing a rejected one submits
// it again. Cancelling an approved one gives cancelledAfterApproved, any other cancelled.
export type InternalRequisitionStatus = "pending" | "approved" | "rejected" | "cancelled" | "cancelledAfterApproved"

export const statusLabels: Record<InternalRequisitionStatus, string> = {
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  cancelledAfterApproved: "Cancelled after approval",
}

export const isCancelled = (status: InternalRequisitionStatus) => status === "cancelled" || status === "cancelledAfterApproved"
export const isEditable = (status: InternalRequisitionStatus) => status === "pending" || status === "rejected"

interface Person {
  id: string
  name: string
}

export interface InternalRequisitionSummary {
  id: number
  // "GPIR-0001", "GPIR-0002", …
  internalRequisitionNumber: string
  supplierId: string
  supplier: Person & { code: string }
  status: InternalRequisitionStatus
  // No purchase order: the GRN is made from the IR.
  isInternational: boolean
  // Expected arrival, "YYYY-MM-DD".
  eta: string | null
  cancelReason: string | null
  cancelledBy: string | null
  cancelledAt: string | null
  // Prepared by.
  createdBy: string | null
  creator: Person | null
  // The IR date.
  createdAt: string
  modifiedBy: string | null
  modifiedAt: string | null
  isDeleted: boolean
}

export interface InternalRequisitionItem {
  id: number
  lineNo: number
  productId: string
  product: { sku: string; title: string; imageUrl: string | null }
  quantity: number
  // The product's stock in hand and minimum stock when the line was saved (the old "Available Qty" and "MOQ").
  stockInHand: number
  minimumStock: number
}

// An approve or reject decision; automatic = approved on save because approval was off.
export interface Approval {
  id: number
  decision: "approved" | "rejected"
  isAutomatic: boolean
  reason: string | null
  createdAt: string
  creator: Person | null
}

export interface InternalRequisition extends Omit<InternalRequisitionSummary, "supplier"> {
  supplier: Person & { code: string; vatNumber: string | null }
  items: InternalRequisitionItem[]
  canceller: Person | null
  // Oldest first.
  approvals: Approval[]
}

export interface NewInternalRequisition {
  supplierId: string
  isInternational: boolean
  eta: string | null
  // In display order; each product once.
  items: { productId: string; quantity: number }[]
}

export type InternalRequisitionUpdate = Partial<NewInternalRequisition> & { id: number }
