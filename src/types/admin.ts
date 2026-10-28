// Pages an account or role can be given access to. Keep in step with the sidebar links.
export const appPageIds = ["dashboard", "products", "reports", "admin"] as const

export type AppPageId = (typeof appPageIds)[number]

export const appPages: { id: AppPageId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "products", label: "Products" },
  { id: "reports", label: "Reports" },
  { id: "admin", label: "Admin" },
]

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
  roleId: string
  status: "active" | "inactive"
  // Only used when the account has no role; otherwise the role's pages apply.
  pages: AppPageId[]
  createdAt: string
}

export type NewAccount = Omit<Account, "id" | "createdAt">

// Partial so profile details and page access can be saved separately. `password` is sent only when it is being replaced.
export type AccountUpdate = Partial<NewAccount> & { id: string; password?: string }
