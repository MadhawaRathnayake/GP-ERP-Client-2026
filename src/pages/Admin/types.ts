import type { PermissionKey } from "@/app/auth"

// One grantable permission from GET /permissions; group by `screenCode` for display.
export interface Permission {
  key: PermissionKey
  screenCode: string
  permissionCode: string
  description: string
  // Only the Super Admin gives or takes it away (Settings, Dropdowns, Approvals).
  superAdminOnly: boolean
}

export interface Role {
  id: string
  name: string
  description: string
  // true = Super Admin: the server gives it every permission; nobody can change it or give it to a user.
  isSystem: boolean
  // The managing role: its admins manage this role and the roles below it. null only on Super Admin.
  parentRoleId: string | null
  // Whether the signed-in user may edit it (it's below their own role; the Super Admin: every role but its own).
  canManage: boolean
  // The middle part of the invoice numbers its users make, e.g. GP01 in 26NOV_GP01_14.
  branchCode: string
  permissions: PermissionKey[]
  createdAt: string
  updatedAt: string
}

export interface NewRole {
  // Left out: the signed-in user's own role.
  parentRoleId?: string
  name: string
  description: string
  branchCode: string
  // Left out on create: the server starts the role with none.
  permissions?: PermissionKey[]
}

// The ids of every role below `roleId`, at any depth (its branch). The server works this out the same way.
export function rolesBelow(roleId: string, roles: readonly Role[]): Set<string> {
  const below = new Set<string>()
  let level = [roleId]
  while (level.length > 0) {
    const next = roles.filter((role) => role.parentRoleId !== null && level.includes(role.parentRoleId) && !below.has(role.id))
    for (const role of next) below.add(role.id)
    level = next.map((role) => role.id)
  }
  return below
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
  // Whether the signed-in user may edit them (their role is below the signed-in user's role).
  canManage: boolean
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
