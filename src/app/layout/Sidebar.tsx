import { BarChart3Icon, LayoutDashboardIcon, PackageIcon, ShieldIcon } from "lucide-react"
import { NavLink } from "react-router-dom"

import { cn } from "@/lib/utils"

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboardIcon, end: true },
  { to: "/products", label: "Products", icon: PackageIcon, end: false },
  { to: "/reports", label: "Reports", icon: BarChart3Icon, end: false },
  { to: "/admin", label: "Admin", icon: ShieldIcon, end: false },
]

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 flex w-56 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center justify-center border-b px-4">
        <img src="/logo.webp" alt="Gunda Power" className="h-10 w-auto" />
      </div>
      <nav className="flex flex-col gap-1 p-2">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )
            }
          >
            <Icon className="size-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
