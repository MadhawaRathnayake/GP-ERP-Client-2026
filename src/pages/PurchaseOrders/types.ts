import type { Approval, DocumentSupplier } from "@/pages/InternalRequisitions/types"

// Mirrors PurchaseOrderStatus in GP-ERP-Server/prisma/schema.prisma. Saving makes it pending (or approved at once when
// Admin → Approvals turns approval off); a pending one is approved or rejected, and editing a rejected one submits it
// again. completed will be set by the GRN (not built yet). Cancelling an approved one gives cancelledAfterApproved,
// any other cancelled; either cancels the IR too.
export type PurchaseOrderStatus = "pending" | "approved" | "rejected" | "completed" | "cancelled" | "cancelledAfterApproved"

export const statusLabels: Record<PurchaseOrderStatus, string> = {
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
  cancelled: "Cancelled",
  cancelledAfterApproved: "Cancelled after approval",
}

export const isCancelled = (status: PurchaseOrderStatus) => status === "cancelled" || status === "cancelledAfterApproved"
export const isEditable = (status: PurchaseOrderStatus) => status === "pending" || status === "rejected"
// The printed PO shows who approved it, so it's printed once approved, as in the old system.
export const isPrintable = (status: PurchaseOrderStatus) => status === "approved" || status === "completed"

interface Person {
  id: string
  name: string
}

export interface PurchaseOrderSummary {
  id: number
  // "GPPO-0001", "GPPO-0002", …
  purchaseOrderNumber: string
  internalRequisitionId: number
  internalRequisition: { id: number; internalRequisitionNumber: string }
  supplierId: string
  supplier: Person & { code: string }
  // The printed date, "YYYY-MM-DD".
  purchaseOrderDate: string
  status: PurchaseOrderStatus
  // Printed as comments or special instructions.
  comments: string | null
  // Internal, not printed.
  remarks: string | null
  subtotal: number
  discountTotal: number
  taxTotal: number
  grandTotal: number
  cancelReason: string | null
  cancelledBy: string | null
  cancelledAt: string | null
  createdBy: string | null
  creator: Person | null
  createdAt: string
  modifiedBy: string | null
  modifiedAt: string | null
  isDeleted: boolean
}

export interface PurchaseOrderItem {
  id: number
  lineNo: number
  productId: string
  product: { sku: string; title: string; imageUrl: string | null }
  quantity: number
  unitPrice: number
  discountType: "none" | "percentage" | "fixed"
  discountValue: number
  // VAT percent when the line was saved.
  taxRate: number
  subtotal: number
  discountAmount: number
  taxAmount: number
  lineTotal: number
}

export interface PurchaseOrder extends Omit<PurchaseOrderSummary, "supplier"> {
  supplier: DocumentSupplier
  items: PurchaseOrderItem[]
  canceller: Person | null
  // Oldest first.
  approvals: Approval[]
}

export interface PurchaseOrderFields {
  supplierId: string
  purchaseOrderDate: string
  comments: string | null
  remarks: string | null
  // In display order; each one of the IR's products, once.
  items: {
    productId: string
    quantity: number
    unitPrice: number
    discountType: "none" | "percentage" | "fixed"
    discountValue: number
  }[]
}

// A pending IR is approved by this save (needs INTERNAL_REQUISITIONS.APPROVE too).
export type NewPurchaseOrder = PurchaseOrderFields & { internalRequisitionId: number }

export type PurchaseOrderUpdate = Partial<PurchaseOrderFields> & { id: number }
