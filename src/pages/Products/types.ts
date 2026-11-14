import type { UnitInput } from "@/pages/SerialItems/types"

// quantity = counted only; serial = every unit has a serial number.
export type TrackingType = "quantity" | "serial"

// "10 years" when it's whole years, otherwise "18 months".
export const warrantyLabel = (months: number) =>
  months > 0 && months % 12 === 0 ? `${months / 12} year${months === 12 ? "" : "s"}` : `${months} months`

export interface Product {
  // "PROD000001"
  id: string
  sku: string
  title: string
  description: string
  // "CAT0001"
  categoryId: string
  manufacturer: string | null
  countryOfOrigin: string | null
  imageUrl: string | null
  documentUrl: string | null
  slug: string | null
  warrantyMonths: number
  // Current price, cost and stock. The server records every change to them as a price, cost or stock movement.
  price: number
  cost: number
  minimumStock: number
  // The one stock figure. Not on the product form: it changes through GRNs, invoices and stock adjustments.
  stockInHand: number
  // Set by the server; goes up with every stock change of any product. Of two copies, the higher one has newer stock.
  stockVersion: number
  additionalInfo: string | null
  trackingType: TrackingType
  createdBy: string | null
  createdAt: string
  modifiedBy: string | null
  modifiedAt: string | null
  // true = deleted; it can be restored.
  isDeleted: boolean
}

// On create, description defaults to "N/A", price, cost and stock to 0, and the other optional fields to null.
export type NewProduct = Pick<Product, "sku" | "title" | "categoryId" | "warrantyMonths" | "trackingType"> &
  Partial<
    Pick<
      Product,
      | "description"
      | "manufacturer"
      | "countryOfOrigin"
      | "imageUrl"
      | "documentUrl"
      | "slug"
      | "price"
      | "cost"
      | "minimumStock"
      | "additionalInfo"
    >
  >

// One product's current stock, as GET /stock and the live stock stream send it.
export type StockLevel = Pick<Product, "id" | "stockInHand" | "stockVersion">

// Stock changed by hand, with the reason (PRODUCTS.ADJUST_STOCK). Exactly one of: quantity (quantity-tracked: + adds,
// - takes); add, remove or register (serial-tracked: its stock moves with its units; register gives serials to old
// stock that was counted without them, and doesn't change stock).
export type StockAdjustment = { id: string; reason: string } & (
  | { quantity: number }
  | { add: UnitInput[] }
  | { remove: number[] }
  | { register: UnitInput[] }
)

export type ProductUpdate =Partial<NewProduct & { isDeleted: boolean }> & { id: string }
