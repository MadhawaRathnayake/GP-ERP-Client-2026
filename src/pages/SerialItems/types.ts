// Mirrors SerialItemStatus in GP-ERP-Server/prisma/schema.prisma: in stock, sold on a finalized invoice, or taken out
// by a stock adjustment.
export type SerialItemStatus = "inStock" | "sold" | "removed"

export const serialItemStatusLabels: Record<SerialItemStatus, string> = {
  inStock: "In stock",
  sold: "Sold",
  removed: "Removed",
}

// One physical unit of a serial-tracked product.
export interface SerialItemSummary {
  id: number
  // Exactly as on the product; unique across all products, ignoring case.
  serialNumber: string
  palletNumber: string | null
  status: SerialItemStatus
  productId: string
  product: { id: string; sku: string; title: string }
  invoiceId: number | null
  // The invoice it is sold on.
  invoice: { id: number; invoiceNumber: string | null } | null
  accessories: { serialNumber: string; accessory: { id: string; name: string } }[]
  createdAt: string
}

export interface SerialItem extends SerialItemSummary {
  goodsReceivedNoteDeliveryId: number | null
  invoice: {
    id: number
    invoiceNumber: string | null
    finalizedAt: string | null
    customer: { id: string; code: string; name: string }
  } | null
  // Its history, oldest first. fromStatus null = registered.
  movements: {
    id: number
    fromStatus: SerialItemStatus | null
    toStatus: SerialItemStatus
    goodsReceivedNoteDeliveryId: number | null
    invoice: { id: number; invoiceNumber: string | null } | null
    remarks: string | null
    creator: { id: string; name: string } | null
    createdAt: string
  }[]
  creator: { id: string; name: string } | null
  modifiedAt: string | null
}

export interface SerialItemPage {
  data: SerialItemSummary[]
  total: number
}

// A new unit as scanned.
export interface UnitInput {
  serialNumber: string
  palletNumber: string | null
  accessories: { accessoryId: string; serialNumber: string }[]
}

export interface SerialNumberCheck {
  serialNumber: string
  // repeated = earlier in the same list; exists = already a unit or an accessory serial.
  result: "new" | "repeated" | "exists"
  existing: { serialItemId: number; sku: string } | null
}

// A serial product whose stock in hand isn't its units in stock.
export interface StockCheckRow {
  productId: string
  sku: string
  title: string
  stockInHand: number
  unitsInStock: number
  // Old stock still to register (below 0: more units than stock, a mistake).
  withoutSerial: number
}

export interface SerialItemUpdate {
  id: number
  serialNumber?: string
  palletNumber?: string | null
  accessories?: { accessoryId: string; serialNumber: string }[]
}
