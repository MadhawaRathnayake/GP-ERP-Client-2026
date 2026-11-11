import { BarChart3Icon, ClipboardListIcon, FileTextIcon, LayoutDashboardIcon, PackageCheckIcon, PackageIcon, ReceiptTextIcon, ShieldIcon, ShoppingCartIcon, TruckIcon, UsersIcon, type LucideIcon } from "lucide-react"

import type { PermissionKey } from "@/app/auth"

interface AppPage {
  label: string
  to: string
  icon: LucideIcon
  end: boolean
  // Shown when the user has this permission, or any one of these.
  permission: PermissionKey | readonly PermissionKey[]
  // Sidebar heading this link sits under. Keep links of one section next to each other.
  section?: string
}

// The admin screen shows a card for each of these the user has, so its link needs any one of them.
export const adminPermissions = ["USERS.VIEW", "ROLES.VIEW", "SETTINGS.VIEW", "DROPDOWNS.VIEW", "APPROVALS.VIEW"] as const

// Whether `can` allows a page's permission (one key, or any one of several).
export function canOpen(can: (permission: PermissionKey) => boolean, permission: PermissionKey | readonly PermissionKey[]) {
  return typeof permission === "string" ? can(permission) : permission.some(can)
}

// Sidebar links. Each shows only when the signed-in user has its `permission`.
export const appPages: AppPage[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboardIcon, end: true, permission: "DASHBOARD.VIEW" },
  { label: "Admin", to: "/admin", icon: ShieldIcon, end: false, permission: adminPermissions, section: "System" },
  { label: "Customers", to: "/customers", icon: UsersIcon, end: false, permission: "CUSTOMERS.VIEW", section: "Master data" },
  { label: "Suppliers", to: "/suppliers", icon: TruckIcon, end: false, permission: "SUPPLIERS.VIEW", section: "Master data" },
  { label: "Products", to: "/products", icon: PackageIcon, end: false, permission: "PRODUCTS.VIEW", section: "Master data" },
  { label: "Quotations", to: "/quotations", icon: ReceiptTextIcon, end: false, permission: "QUOTATIONS.VIEW", section: "Sales" },
  { label: "Invoices", to: "/invoices", icon: FileTextIcon, end: false, permission: "INVOICES.VIEW", section: "Sales" },
  { label: "Delivery notes", to: "/delivery-notes", icon: PackageCheckIcon, end: false, permission: "DELIVERY_NOTES.VIEW", section: "Sales" },
  { label: "Internal requisitions", to: "/internal-requisitions", icon: ClipboardListIcon, end: false, permission: "INTERNAL_REQUISITIONS.VIEW", section: "Procurement" },
  { label: "Purchase orders", to: "/purchase-orders", icon: ShoppingCartIcon, end: false, permission: "PURCHASE_ORDERS.VIEW", section: "Procurement" },
  { label: "Reports", to: "/reports", icon: BarChart3Icon, end: false, permission: "REPORTS.VIEW", section: "Analysis" },
]

// Where to send a user who lands somewhere they cannot go: their first sidebar screen (none if their role has no screens).
export function homePage(can: (permission: PermissionKey) => boolean) {
  return appPages.find((page) => canOpen(can, page.permission))
}
