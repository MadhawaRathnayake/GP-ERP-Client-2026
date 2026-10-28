import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { http, mockDelay, USE_MOCK } from "@/lib/http"

import type { Account, AccountUpdate, NewAccount, NewRole, Role, RoleUpdate } from "./types"

const mockRoles: Role[] = [
  { id: "admin", name: "Administrator", description: "Full access to every module and setting.", pages: ["dashboard", "products", "reports", "admin"] },
  { id: "manager", name: "Manager", description: "Manages products and views reports.", pages: ["dashboard", "products", "reports"] },
  { id: "viewer", name: "Viewer", description: "Read-only access.", pages: ["dashboard", "reports"] },
]

const mockAccounts: Account[] = [
  { id: "1", name: "Madhawa Perera", email: "madhawa@gp-erp.local", roleId: "admin", status: "active", createdAt: "2026-08-12T08:00:00Z" },
  { id: "2", name: "Nimal Silva", email: "nimal@gp-erp.local", roleId: "manager", status: "active", createdAt: "2026-09-03T10:20:00Z" },
  { id: "3", name: "Kumari Fernando", email: "kumari@gp-erp.local", roleId: "viewer", status: "inactive", createdAt: "2026-10-11T14:45:00Z" },
  { id: "4", name: "Sunil Jayasuriya", email: "sunil@gp-erp.local", roleId: "manager", status: "active", createdAt: "2026-10-22T09:30:00Z" },
]

export async function fetchAccounts(): Promise<Account[]> {
  if (USE_MOCK) {
    await mockDelay()
    return [...mockAccounts]
  }
  const { data } = await http.get<Account[]>("/accounts")
  return data
}

export async function createAccount(newAccount: NewAccount): Promise<Account> {
  if (USE_MOCK) {
    await mockDelay()
    if (mockAccounts.some((account) => account.email.toLowerCase() === newAccount.email.toLowerCase())) {
      throw new Error(`An account with ${newAccount.email} already exists`)
    }
    const account: Account = { ...newAccount, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    mockAccounts.unshift(account)
    return account
  }
  const { data } = await http.post<Account>("/accounts", newAccount)
  return data
}

export async function fetchAccount(id: string): Promise<Account> {
  if (USE_MOCK) {
    await mockDelay()
    const account = mockAccounts.find((account) => account.id === id)
    if (!account) throw new Error("Account not found")
    return { ...account }
  }
  const { data } = await http.get<Account>(`/accounts/${id}`)
  return data
}

export async function updateAccount({ id, ...changes }: AccountUpdate): Promise<Account> {
  if (USE_MOCK) {
    await mockDelay()
    const index = mockAccounts.findIndex((account) => account.id === id)
    if (index === -1) throw new Error("Account not found")
    const { email } = changes
    if (
      email &&
      mockAccounts.some((account) => account.id !== id && account.email.toLowerCase() === email.toLowerCase())
    ) {
      throw new Error(`An account with ${email} already exists`)
    }
    // The mock never stores passwords, so only the account fields are merged.
    const current = mockAccounts[index]
    const account: Account = {
      ...current,
      name: changes.name ?? current.name,
      email: changes.email ?? current.email,
      roleId: changes.roleId ?? current.roleId,
      status: changes.status ?? current.status,
    }
    mockAccounts[index] = account
    return account
  }
  const { data } = await http.patch<Account>(`/accounts/${id}`, changes)
  return data
}

export async function fetchRoles(): Promise<Role[]> {
  if (USE_MOCK) {
    await mockDelay()
    return [...mockRoles]
  }
  const { data } = await http.get<Role[]>("/roles")
  return data
}

export async function fetchRole(id: string): Promise<Role> {
  if (USE_MOCK) {
    await mockDelay()
    const role = mockRoles.find((role) => role.id === id)
    if (!role) throw new Error("Role not found")
    return { ...role }
  }
  const { data } = await http.get<Role>(`/roles/${id}`)
  return data
}

export async function updateRole({ id, ...changes }: RoleUpdate): Promise<Role> {
  if (USE_MOCK) {
    await mockDelay()
    const index = mockRoles.findIndex((role) => role.id === id)
    if (index === -1) throw new Error("Role not found")
    const { name } = changes
    if (name && mockRoles.some((role) => role.id !== id && role.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`A role named "${name}" already exists`)
    }
    const role: Role = { ...mockRoles[index], ...changes }
    mockRoles[index] = role
    return role
  }
  const { data } = await http.patch<Role>(`/roles/${id}`, changes)
  return data
}

export async function createRole(newRole: NewRole): Promise<Role> {
  if (USE_MOCK) {
    await mockDelay()
    if (mockRoles.some((role) => role.name.toLowerCase() === newRole.name.toLowerCase())) {
      throw new Error(`A role named "${newRole.name}" already exists`)
    }
    const role: Role = { ...newRole, id: crypto.randomUUID() }
    mockRoles.push(role)
    return role
  }
  const { data } = await http.post<Role>("/roles", newRole)
  return data
}

export function useAccounts() {
  return useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts })
}

export function useAccount(id: string) {
  return useQuery({ queryKey: ["accounts", id], queryFn: () => fetchAccount(id) })
}

export function useRoles() {
  return useQuery({ queryKey: ["roles"], queryFn: fetchRoles })
}

export function useRole(id: string) {
  return useQuery({ queryKey: ["roles", id], queryFn: () => fetchRole(id) })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateRole,
    onSuccess: (role) => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] })
      toast.success(`Saved changes for role "${role.name}"`)
    },
    onError: (error) => {
      toast.error(`Could not save role: ${error.message}`)
    },
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createAccount,
    onSuccess: (account) => {
      void queryClient.invalidateQueries({ queryKey: ["accounts"] })
      toast.success(`Created profile for ${account.name}`)
    },
    onError: (error) => {
      toast.error(`Could not create profile: ${error.message}`)
    },
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateAccount,
    onSuccess: (account) => {
      void queryClient.invalidateQueries({ queryKey: ["accounts"] })
      toast.success(`Saved changes for ${account.name}`)
    },
    onError: (error) => {
      toast.error(`Could not save changes: ${error.message}`)
    },
  })
}

export function useCreateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createRole,
    onSuccess: (role) => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] })
      toast.success(`Created role "${role.name}"`)
    },
    onError: (error) => {
      toast.error(`Could not create role: ${error.message}`)
    },
  })
}
