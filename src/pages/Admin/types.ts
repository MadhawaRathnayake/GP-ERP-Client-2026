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
  permissions: PermissionKey[]
  createdAt: string
  updatedAt: string
}

export interface NewRole {
  name: string
  description: string
  permissions: PermissionKey[]
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
  isActive: boolean
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

// `password` is sent only when it is being replaced. `isActive: false` deactivates the user and signs them out.
export type UserUpdate = Partial<NewUser & { isActive: boolean }> & { id: string }
