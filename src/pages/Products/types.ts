export interface Product {
  id: string
  sku: string
  name: string
  status: "active" | "inactive"
  price: number
  cost: number
  stock: number
  stockInTransit: number
  stockSold: number
  createdAt: string
  updatedAt: string
}

// On create, `status` defaults to active and the stock fields to 0.
export type NewProduct = Pick<Product, "sku" | "name" | "price" | "cost"> &
  Partial<Pick<Product, "status" | "stock" | "stockInTransit" | "stockSold">>

export type ProductUpdate = Partial<NewProduct> & { id: string }
