import { HOME_COUNTRY } from "@/pages/Countries/api"
import type { PurchaseOrderStatus } from "@/pages/PurchaseOrders/types"
import type { Supplier } from "@/pages/Suppliers/types"

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
  // No purchase order: the printed IR is the document, and the GRN is made from the IR.
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

// What the printed IR and PO show of the supplier.
export type DocumentSupplier = Person &
  Pick<Supplier, "code" | "vatNumber" | "email" | "phones" | "houseNumber" | "street" | "city" | "district" | "province" | "country">

// The old address was one line, with the country's name added unless it's Sri Lanka. For the printed IR, PO and GRN.
export function supplierAddress(supplier: DocumentSupplier, countryName: string) {
  const address = [supplier.houseNumber, supplier.street, supplier.city, supplier.district].filter(Boolean).join(", ")
  return supplier.country === HOME_COUNTRY ? address : [address, countryName].filter(Boolean).join(", ")
}

export const supplierTelephone = (supplier: DocumentSupplier) => supplier.phones.join(" / ")

// The old moment(…).format("DD/MM/YYYY, h:mm:ss a"), in the browser's time zone: "10/11/2026, 3:05:09 pm".
export function formatDateTime(iso: string) {
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, "0")
  const hours = date.getHours()
  return (
    `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}, ` +
    `${hours % 12 || 12}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${hours < 12 ? "am" : "pm"}`
  )
}

export interface InternalRequisition extends Omit<InternalRequisitionSummary, "supplier"> {
  supplier: DocumentSupplier
  // Local IRs: their purchase order, once made.
  purchaseOrder: { id: number; purchaseOrderNumber: string; status: PurchaseOrderStatus } | null
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
