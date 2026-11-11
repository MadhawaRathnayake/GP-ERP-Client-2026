import type { Approval, DocumentSupplier } from "@/pages/InternalRequisitions/types"
import type { PurchaseOrderStatus } from "@/pages/PurchaseOrders/types"

// Mirrors GoodsReceivedNoteStatus in GP-ERP-Server/prisma/schema.prisma. Saving makes it pending (or approved at once
// when Admin → Approvals turns approval off); a pending one is approved (its goods go into stock; final) or rejected, and
// editing a rejected one submits it again. A pending or rejected one can be cancelled.
export type GoodsReceivedNoteStatus = "pending" | "approved" | "rejected" | "cancelled"

export const statusLabels: Record<GoodsReceivedNoteStatus, string> = {
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
}

// Nothing has gone into stock yet, so it can still be edited or cancelled. An order has at most one open GRN.
export const isOpen = (status: GoodsReceivedNoteStatus) => status === "pending" || status === "rejected"

interface Person {
  id: string
  name: string
}

export interface GoodsReceivedNoteSummary {
  id: number
  // "GPGRN-0001", "GPGRN-0002", …
  grnNumber: string
  internalRequisitionId: number
  // Its purchase order, for a local IR.
  internalRequisition: {
    id: number
    internalRequisitionNumber: string
    isInternational: boolean
    purchaseOrder: { id: number; purchaseOrderNumber: string } | null
  }
  supplierId: string
  supplier: Person & { code: string }
  // The printed date, "YYYY-MM-DD".
  receivedDate: string
  supplierInvoiceNumber: string | null
  status: GoodsReceivedNoteStatus
  cancelReason: string | null
  cancelledBy: string | null
  cancelledAt: string | null
  // Prepared by.
  createdBy: string | null
  creator: Person | null
  createdAt: string
  modifiedBy: string | null
  modifiedAt: string | null
  isDeleted: boolean
}

export interface GoodsReceivedNoteItem {
  id: number
  lineNo: number
  productId: string
  product: { sku: string; title: string; imageUrl: string | null }
  // The order line's quantity.
  orderedQuantity: number
  // Received in this delivery.
  receivedQuantity: number
  remarks: string | null
}

export interface GoodsReceivedNote extends Omit<GoodsReceivedNoteSummary, "supplier"> {
  supplier: DocumentSupplier
  items: GoodsReceivedNoteItem[]
  canceller: Person | null
  // Oldest first.
  approvals: Approval[]
}

// What an IR's order (its purchase order, or the IR itself when international) has received on approved GRNs.
export interface OrderReceipt {
  internalRequisitionId: number
  internalRequisitionNumber: string
  isInternational: boolean
  purchaseOrder: { id: number; purchaseOrderNumber: string; status: PurchaseOrderStatus } | null
  supplier: Person & { code: string }
  // In the order's line order.
  lines: {
    productId: string
    product: { sku: string; title: string; imageUrl: string | null }
    orderedQuantity: number
    receivedQuantity: number
    outstandingQuantity: number
  }[]
  // Newest first.
  goodsReceivedNotes: { id: number; grnNumber: string; status: GoodsReceivedNoteStatus; receivedDate: string }[]
  // Why a GRN can't be made for the order now; null when it can.
  blockedReason: string | null
}

export interface GoodsReceivedNoteFields {
  receivedDate: string
  supplierInvoiceNumber: string | null
  // One per product of the order; 0 when none of it came.
  items: { productId: string; receivedQuantity: number; remarks: string | null }[]
}

export type NewGoodsReceivedNote = GoodsReceivedNoteFields & { internalRequisitionId: number }

export type GoodsReceivedNoteUpdate = Partial<GoodsReceivedNoteFields> & { id: number }
