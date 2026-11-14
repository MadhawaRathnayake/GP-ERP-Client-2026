// What can come in a product's box with its own serial: a WiFi module, a data logger, a battery …
export interface Accessory {
  // "ACC0001"
  id: string
  name: string
  description: string
  // The product it is when sold on its own, if any (for reference only).
  productId: string | null
  product: { id: string; sku: string; title: string } | null
  createdBy: string | null
  createdAt: string
  modifiedBy: string | null
  modifiedAt: string | null
  isDeleted: boolean
}

export interface NewAccessory {
  name: string
  description: string
  productId: string | null
}

export type AccessoryUpdate = Partial<NewAccessory & { isDeleted: boolean }> & { id: string }

// What comes with every unit of a product, and how many.
export interface ProductAccessory {
  accessoryId: string
  accessory: { id: string; name: string; isDeleted: boolean }
  quantity: number
}
