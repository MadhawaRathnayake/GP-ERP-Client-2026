import { BarChart3Icon, LayoutDashboardIcon, PackageIcon, ShieldIcon, UsersIcon, type LucideIcon } from "lucide-react"

import type { PermissionKey } from "@/app/auth"

interface AppPage {
  label: string
  to: string
  icon: LucideIcon
  end: boolean
  permission: PermissionKey
}

// Sidebar links. Each shows only when the signed-in user has its `permission`.
export const appPages: AppPage[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboardIcon, end: true, permission: "DASHBOARD.VIEW" },
  { label: "Products", to: "/products", icon: PackageIcon, end: false, permission: "PRODUCTS.VIEW" },
  { label: "Customers", to: "/customers", icon: UsersIcon, end: false, permission: "CUSTOMERS.VIEW" },
  { label: "Reports", to: "/reports", icon: BarChart3Icon, end: false, permission: "REPORTS.VIEW" },
  { label: "Admin", to: "/admin", icon: ShieldIcon, end: false, permission: "ADMIN.VIEW" },
]

// Where to send a user who lands somewhere they cannot go: their first sidebar screen, else the profile page.
export function homePage(can: (permission: PermissionKey) => boolean) {
  return appPages.find((page) => can(page.permission)) ?? { label: "Profile", to: "/profile" }
}
