import { BarChart3Icon, LayoutDashboardIcon, PackageIcon, ShieldIcon } from "lucide-react"

// Every top-level page: drives the sidebar links and the page-access checkboxes for roles and accounts.
export const appPages = [
  { id: "dashboard", label: "Dashboard", to: "/", icon: LayoutDashboardIcon, end: true },
  { id: "products", label: "Products", to: "/products", icon: PackageIcon, end: false },
  { id: "reports", label: "Reports", to: "/reports", icon: BarChart3Icon, end: false },
  { id: "admin", label: "Admin", to: "/admin", icon: ShieldIcon, end: false },
] as const

export type AppPageId = (typeof appPages)[number]["id"]

export const appPageIds = appPages.map((page) => page.id)
