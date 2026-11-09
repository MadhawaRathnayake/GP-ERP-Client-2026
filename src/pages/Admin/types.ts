import type { PermissionKey } from "@/app/auth"

// One grantable permission from GET /permissions; group by `screenCode` for display.
export interface Permission {
  key: PermissionKey
  screenCode: string
  permissionCode: string
  description: string
}

export interface Role {
  id: string
  name: string
  description: string
  // true = Super Admin: the server gives it every permission, and its name and permissions can't be changed.
  isSystem: boolean
  // The middle part of the invoice numbers its users make, e.g. GP01 in 26NOV_GP01_14.
  branchCode: string
  permissions: PermissionKey[]
  createdAt: string
  updatedAt: string
}

export interface NewRole {
  name: string
  description: string
  branchCode: string
  // Left out on create: the server starts the role with none.
  permissions?: PermissionKey[]
}

// `permissions` replaces the role's whole list; leave it out to keep the current one.
export type RoleUpdate = Partial<NewRole> & { id: string }

// Every user has a role; the role's permissions decide what they can open and do.
export interface User {
  id: string
  name: string
  email: string
  roleId: string
  roleName: string
  isDeleted: boolean
  createdAt: string
  createdBy: string
  modifiedAt: string | null
  modifiedBy: string | null
}

export interface NewUser {
  name: string
  email: string
  password: string
  roleId: string
}

// `password` is sent only when it is being replaced. `isDeleted: true` deactivates the user and signs them out.
export type UserUpdate = Partial<NewUser & { isDeleted: boolean }> & { id: string }

// users = the users picked one by one; roles = every active user with one of the picked roles.
export type UserDropdownSource = "users" | "roles"

// A user dropdown in a form elsewhere (e.g. a quotation's sales manager) and which users it offers. The dropdowns are
// defined in the server's code; deactivated users never show. Both lists are kept, so switching source loses nothing.
export interface UserDropdown {
  // e.g. "SALES_MANAGER"
  code: string
  label: string
  source: UserDropdownSource
  userIds: string[]
  roleIds: string[]
}

export type UserDropdownUpdate = Partial<Pick<UserDropdown, "source" | "userIds" | "roleIds">> & { code: string }

// Whether a screen's documents need approval. The screens are defined in the server's code; one nobody has saved yet
// needs approval. When it doesn't, documents are approved on save.
export interface ApprovalRule {
  // e.g. "INTERNAL_REQUISITIONS"
  screen: string
  label: string
  isRequired: boolean
}
