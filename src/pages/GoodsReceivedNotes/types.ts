import type { DocumentSupplier } from "@/pages/InternalRequisitions/types"
import type { TrackingType } from "@/pages/Products/types"
import type { PurchaseOrderStatus } from "@/pages/PurchaseOrders/types"

// Mirrors GoodsReceivedNoteStatus in GP-ERP-Server/prisma/schema.prisma, worked out by the server: needSerialNumbers
// while a serial-tracked line has fewer serials than it received, else partiallyCompleted while something ordered is
// still to come, else completed. There is no approval: a delivery puts its goods in stock when it is saved.
export type GoodsReceivedNoteStatus = "partiallyCompleted" | "needSerialNumbers" | "completed"

export const statusLabels: Record<GoodsReceivedNoteStatus, string> = {
  partiallyCompleted: "Partially completed",
  needSerialNumbers: "Need serial numbers",
  completed: "Completed",
}

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
  status: GoodsReceivedNoteStatus
  // Oldest first; dates are "YYYY-MM-DD".
  deliveries: { deliveryNo: number; receivedDate: string; supplierInvoiceNumber: string | null }[]
  // Prepared by.
  createdBy: string | null
  creator: Person | null
  createdAt: string
  modifiedBy: string | null
  modifiedAt: string | null
  isDeleted: boolean
}

// One line per line of the order.
export interface GoodsReceivedNoteItem {
  id: number
  lineNo: number
  productId: string
  product: { sku: string; title: string; imageUrl: string | null; trackingType: TrackingType }
  orderedQuantity: number
  // Over every delivery.
  receivedQuantity: number
  outstandingQuantity: number
  // Serial-tracked lines: units with a serial so far, and how many still need one (both 0 for counted lines).
  serialsEntered: number
  serialsMissing: number
}

// One batch of goods that arrived (e.g. one container).
export interface GoodsReceivedNoteDelivery {
  id: number
  deliveryNo: number
  receivedDate: string
  supplierInvoiceNumber: string | null
  remarks: string | null
  // Recorded in the old system: already in stock there, so its units aren't asked for serials (serialsMissing leaves
  // them out).
  isImported: boolean
  items: { productId: string; product: { sku: string; title: string }; quantity: number; remarks: string | null }[]
  creator: Person | null
  createdAt: string
}

export interface GoodsReceivedNote extends Omit<GoodsReceivedNoteSummary, "supplier" | "deliveries"> {
  supplier: DocumentSupplier
  items: GoodsReceivedNoteItem[]
  deliveries: GoodsReceivedNoteDelivery[]
}

// What an IR's order (its purchase order, or the IR itself when international) has received on its GRN.
export interface OrderReceipt {
  internalRequisitionId: number
  internalRequisitionNumber: string
  isInternational: boolean
  purchaseOrder: { id: number; purchaseOrderNumber: string; status: PurchaseOrderStatus } | null
  supplier: Person & { code: string }
  // In the order's line order.
  lines: {
    productId: string
    product: { sku: string; title: string; imageUrl: string | null; trackingType: TrackingType }
    orderedQuantity: number
    receivedQuantity: number
    outstandingQuantity: number
  }[]
  // The order's GRN, once its first delivery is recorded.
  goodsReceivedNote: { id: number; grnNumber: string; status: GoodsReceivedNoteStatus } | null
  // Why a delivery can't be recorded for the order now; null when it can.
  blockedReason: string | null
}

export interface DeliveryFields {
  receivedDate: string
  supplierInvoiceNumber: string | null
  remarks: string | null
  // What came of each product; 0 for what didn't.
  items: { productId: string; quantity: number; remarks: string | null }[]
}

export type NewGoodsReceivedNote = DeliveryFields & { internalRequisitionId: number }
