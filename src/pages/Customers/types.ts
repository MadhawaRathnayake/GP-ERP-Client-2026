// Placeholder fields from the API; they will change once the real customer model is defined.
export interface Customer {
  id: string
  code: string
  name: string
  email: string | null
  phone: string | null
  creditLimit: number
  createdAt: string
  updatedAt: string
}
