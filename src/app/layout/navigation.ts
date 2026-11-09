import { BarChart3Icon, FileTextIcon, LayoutDashboardIcon, PackageCheckIcon, PackageIcon, ReceiptTextIcon, ShieldIcon, TruckIcon, UsersIcon, type LucideIcon } from "lucide-react"

import type { PermissionKey } from "@/app/auth"

interface AppPage {
  label: string
  to: string
  icon: LucideIcon
  end: boolean
  permission: PermissionKey
  // Sidebar heading this link sits under. Keep links of one section next to each other.
  section?: string
}

// Sidebar links. Each shows only when the signed-in user has its `permission`.
export const appPages: AppPage[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboardIcon, end: true, permission: "DASHBOARD.VIEW" },
  { label: "Admin", to: "/admin", icon: ShieldIcon, end: false, permission: "ADMIN.VIEW", section: "System" },
  { label: "Customers", to: "/customers", icon: UsersIcon, end: false, permission: "CUSTOMERS.VIEW", section: "Master data" },
  { label: "Suppliers", to: "/suppliers", icon: TruckIcon, end: false, permission: "SUPPLIERS.VIEW", section: "Master data" },
  { label: "Products", to: "/products", icon: PackageIcon, end: false, permission: "PRODUCTS.VIEW", section: "Master data" },
  { label: "Quotations", to: "/quotations", icon: ReceiptTextIcon, end: false, permission: "QUOTATIONS.VIEW", section: "Sales" },
  { label: "Invoices", to: "/invoices", icon: FileTextIcon, end: false, permission: "INVOICES.VIEW", section: "Sales" },
  { label: "Delivery notes", to: "/delivery-notes", icon: PackageCheckIcon, end: false, permission: "DELIVERY_NOTES.VIEW", section: "Sales" },
  { label: "Reports", to: "/reports", icon: BarChart3Icon, end: false, permission: "REPORTS.VIEW", section: "Analysis" },
]

// Where to send a user who lands somewhere they cannot go: their first sidebar screen (none if their role has no screens).
export function homePage(can: (permission: PermissionKey) => boolean) {
  return appPages.find((page) => can(page.permission))
}
