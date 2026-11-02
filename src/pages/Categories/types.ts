export interface Category {
  id: string
  name: string
  description: string
  createdBy: string | null
  createdAt: string
  modifiedBy: string | null
  modifiedAt: string | null
  isDeleted: boolean
}

export interface NewCategory {
  name: string
  description: string
}

export type CategoryUpdate = Partial<NewCategory & { isDeleted: boolean }> & { id: string }
