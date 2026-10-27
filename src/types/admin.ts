export interface Role {
  id: string
  name: string
  description: string
}

export type NewRole = Omit<Role, "id">

export interface Account {
  id: string
  name: string
  email: string
  roleId: string
  status: "active" | "inactive"
  createdAt: string
}

export type NewAccount = Omit<Account, "id" | "createdAt">
