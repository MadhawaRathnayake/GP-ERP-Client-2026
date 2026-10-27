export interface Item {
  id: string
  name: string
  status: "active" | "inactive"
  createdAt: string
}

export type NewItem = Omit<Item, "id" | "createdAt">
