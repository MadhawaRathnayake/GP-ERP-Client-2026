export interface Product {
  id: string
  sku: string
  price: number
  cost: number
  stock: number
  stockInTransit: number
  stockSold: number
}

export interface ProductPage {
  data: Product[]
  total: number
}

// Shape of the placeholder create form until /products has a real create contract.
export interface NewProduct {
  name: string
  status: "active" | "inactive"
}

export interface CreatedProduct extends NewProduct {
  id: string
  createdAt: string
}
