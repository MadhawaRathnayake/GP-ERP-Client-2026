import type { AppPageId } from "@/app/layout/navigation"

export interface Role {
  id: string
  name: string
  description: string
  pages: AppPageId[]
}

export type NewRole = Omit<Role, "id">

// Partial so role details and page access can be saved separately.
export type RoleUpdate = Partial<NewRole> & { id: string }

export interface Account {
  id: string
  name: string
  email: string
  // Every account has a role; the role decides which pages it can open.
  roleId: string
  status: "active" | "inactive"
  createdAt: string
}

export type NewAccount = Omit<Account, "id" | "createdAt">

// Partial so only changed fields are sent. `password` is sent only when it is being replaced.
export type AccountUpdate = Partial<NewAccount> & { id: string; password?: string }
