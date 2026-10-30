// quantity = counted only; serial = every unit has a serial number.
export type TrackingType = "quantity" | "serial"

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
  stockInHand: number
  stockPreOrder: number
  stockInTransit: number
  stockOnArrival: number
  additionalInfo: string | null
  trackingType: TrackingType
  createdBy: string | null
  createdAt: string
  modifiedBy: string | null
  modifiedAt: string | null
  // false = deleted; it can be restored.
  isActive: boolean
}

// On create, description defaults to "N/A", price, cost and the stock numbers to 0, and the other optional fields to null.
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
      | "stockInHand"
      | "stockPreOrder"
      | "stockInTransit"
      | "stockOnArrival"
      | "additionalInfo"
    >
  >

export type ProductUpdate = Partial<NewProduct & { isActive: boolean }> & { id: string }
