import axios from "axios"

import type { Account, AccountUpdate, NewAccount, NewRole, Role, RoleUpdate } from "@/types/admin"
import type { CreatedProduct, NewProduct, Product, ProductPage } from "@/types/product"

// Serve in-memory data until a backend exists. Set to false to use the real API.
const USE_MOCK = true

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) || "/api",
  // Send the session cookie to the API (it may be on another port/origin).
  withCredentials: true,
})

const mockProducts: CreatedProduct[] = [
  { id: "1", name: "Office chairs", status: "active", createdAt: "2026-09-02T09:15:00Z" },
  { id: "2", name: "Standing desks", status: "active", createdAt: "2026-09-14T13:40:00Z" },
  { id: "3", name: "Printer toner", status: "inactive", createdAt: "2026-10-01T08:05:00Z" },
  { id: "4", name: "Laptops", status: "active", createdAt: "2026-10-20T16:30:00Z" },
]

const delay = () => new Promise((resolve) => setTimeout(resolve, 400))

// Products are read from the real /products endpoint; the API pages results (1-based) and filters by `sku`.
export async function fetchProducts(q: string | undefined, page: number, limit: number): Promise<ProductPage> {
  const { data } = await api.get<ProductPage>("/products", { params: { sku: q?.trim() || undefined, page, limit } })
  return data
}

export async function fetchProduct(id: string): Promise<Product> {
  const { data } = await api.get<Product>(`/products/${id}`)
  return data
}

export async function createProduct(newProduct: NewProduct): Promise<CreatedProduct> {
  if (USE_MOCK) {
    await delay()
    const product: CreatedProduct = { ...newProduct, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    mockProducts.unshift(product)
    return product
  }
  const { data } = await api.post<CreatedProduct>("/products", newProduct)
  return data
}

const mockRoles: Role[] = [
  { id: "admin", name: "Administrator", description: "Full access to every module and setting.", pages: ["dashboard", "products", "reports", "admin"] },
  { id: "manager", name: "Manager", description: "Manages products and views reports.", pages: ["dashboard", "products", "reports"] },
  { id: "viewer", name: "Viewer", description: "Read-only access.", pages: ["dashboard", "reports"] },
]

const mockAccounts: Account[] = [
  { id: "1", name: "Madhawa Perera", email: "madhawa@gp-erp.local", roleId: "admin", status: "active", pages: [], createdAt: "2026-08-12T08:00:00Z" },
  { id: "2", name: "Nimal Silva", email: "nimal@gp-erp.local", roleId: "manager", status: "active", pages: [], createdAt: "2026-09-03T10:20:00Z" },
  { id: "3", name: "Kumari Fernando", email: "kumari@gp-erp.local", roleId: "viewer", status: "inactive", pages: [], createdAt: "2026-10-11T14:45:00Z" },
  { id: "4", name: "Sunil Jayasuriya", email: "sunil@gp-erp.local", roleId: "", status: "active", pages: ["dashboard", "products"], createdAt: "2026-10-22T09:30:00Z" },
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

export async function fetchAccount(id: string): Promise<Account> {
  if (USE_MOCK) {
    await delay()
    const account = mockAccounts.find((account) => account.id === id)
    if (!account) throw new Error("Account not found")
    return { ...account }
  }
  const { data } = await api.get<Account>(`/accounts/${id}`)
  return data
}

export async function updateAccount({ id, ...changes }: AccountUpdate): Promise<Account> {
  if (USE_MOCK) {
    await delay()
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
      pages: changes.pages ?? current.pages,
    }
    mockAccounts[index] = account
    return account
  }
  const { data } = await api.patch<Account>(`/accounts/${id}`, changes)
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

export async function fetchRole(id: string): Promise<Role> {
  if (USE_MOCK) {
    await delay()
    const role = mockRoles.find((role) => role.id === id)
    if (!role) throw new Error("Role not found")
    return { ...role }
  }
  const { data } = await api.get<Role>(`/roles/${id}`)
  return data
}

export async function updateRole({ id, ...changes }: RoleUpdate): Promise<Role> {
  if (USE_MOCK) {
    await delay()
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
  const { data } = await api.patch<Role>(`/roles/${id}`, changes)
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
