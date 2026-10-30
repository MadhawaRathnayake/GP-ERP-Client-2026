export interface Category {
  id: string
  name: string
  description: string
  createdBy: string | null
  createdAt: string
  modifiedBy: string | null
  modifiedAt: string | null
  isActive: boolean
}

export interface NewCategory {
  name: string
  description: string
}

export type CategoryUpdate = Partial<NewCategory & { isActive: boolean }> & { id: string }
