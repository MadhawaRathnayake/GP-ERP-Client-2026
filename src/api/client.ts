import axios from "axios"

import type { Account, NewAccount, NewRole, Role } from "@/types/admin"
import type { Item, NewItem } from "@/types/item"

// Serve in-memory data until a backend exists. Set to false to use the real API.
const USE_MOCK = true

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) || "/api",
})

const mockItems: Item[] = [
  { id: "1", name: "Office chairs", status: "active", createdAt: "2026-09-02T09:15:00Z" },
  { id: "2", name: "Standing desks", status: "active", createdAt: "2026-09-14T13:40:00Z" },
  { id: "3", name: "Printer toner", status: "inactive", createdAt: "2026-10-01T08:05:00Z" },
  { id: "4", name: "Laptops", status: "active", createdAt: "2026-10-20T16:30:00Z" },
]

const delay = () => new Promise((resolve) => setTimeout(resolve, 400))

export async function fetchItems(q?: string): Promise<Item[]> {
  if (USE_MOCK) {
    await delay()
    const term = q?.trim().toLowerCase()
    return term ? mockItems.filter((item) => item.name.toLowerCase().includes(term)) : [...mockItems]
  }
  const { data } = await api.get<Item[]>("/items", { params: { q } })
  return data
}

export async function fetchItem(id: string): Promise<Item> {
  if (USE_MOCK) {
    await delay()
    const item = mockItems.find((item) => item.id === id)
    if (!item) throw new Error("Item not found")
    return item
  }
  const { data } = await api.get<Item>(`/items/${id}`)
  return data
}

export async function createItem(newItem: NewItem): Promise<Item> {
  if (USE_MOCK) {
    await delay()
    const item: Item = { ...newItem, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    mockItems.unshift(item)
    return item
  }
  const { data } = await api.post<Item>("/items", newItem)
  return data
}

const mockRoles: Role[] = [
  { id: "admin", name: "Administrator", description: "Full access to every module and setting." },
  { id: "manager", name: "Manager", description: "Manages items and views reports." },
  { id: "viewer", name: "Viewer", description: "Read-only access." },
]

const mockAccounts: Account[] = [
  { id: "1", name: "Madhawa Perera", email: "madhawa@gp-erp.local", roleId: "admin", status: "active", createdAt: "2026-08-12T08:00:00Z" },
  { id: "2", name: "Nimal Silva", email: "nimal@gp-erp.local", roleId: "manager", status: "active", createdAt: "2026-09-03T10:20:00Z" },
  { id: "3", name: "Kumari Fernando", email: "kumari@gp-erp.local", roleId: "viewer", status: "inactive", createdAt: "2026-10-11T14:45:00Z" },
]

export async function fetchAccounts(): Promise<Account[]> {
  if (USE_MOCK) {
    await delay()
    return [...mockAccounts]
  }
  const { data } = await api.get<Account[]>("/accounts")
  return data
}

export async function createAccount(newAccount: NewAccount): Promise<Account> {
  if (USE_MOCK) {
    await delay()
    if (mockAccounts.some((account) => account.email.toLowerCase() === newAccount.email.toLowerCase())) {
      throw new Error(`An account with ${newAccount.email} already exists`)
    }
    const account: Account = { ...newAccount, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    mockAccounts.unshift(account)
    return account
  }
  const { data } = await api.post<Account>("/accounts", newAccount)
  return data
}

export async function fetchRoles(): Promise<Role[]> {
  if (USE_MOCK) {
    await delay()
    return [...mockRoles]
  }
  const { data } = await api.get<Role[]>("/roles")
  return data
}

export async function createRole(newRole: NewRole): Promise<Role> {
  if (USE_MOCK) {
    await delay()
    if (mockRoles.some((role) => role.name.toLowerCase() === newRole.name.toLowerCase())) {
      throw new Error(`A role named "${newRole.name}" already exists`)
    }
    const role: Role = { ...newRole, id: crypto.randomUUID() }
    mockRoles.push(role)
    return role
  }
  const { data } = await api.post<Role>("/roles", newRole)
  return data
}
