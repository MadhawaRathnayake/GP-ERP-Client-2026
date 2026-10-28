import {
  BarChart3Icon,
  LayoutDashboardIcon,
  PackageIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  ShieldIcon,
} from "lucide-react"
import { NavLink } from "react-router-dom"

import { cn } from "@/lib/utils"

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboardIcon, end: true },
  { to: "/products", label: "Products", icon: PackageIcon, end: false },
  { to: "/reports", label: "Reports", icon: BarChart3Icon, end: false },
  { to: "/admin", label: "Admin", icon: ShieldIcon, end: false },
]

// Below `md` the sidebar is always icons-only, so it never covers the page on phones.
// From `md` up, `collapsed` switches between icons-only and full width.
export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const showLabels = collapsed ? "sr-only" : "sr-only md:not-sr-only"

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-20 flex w-14 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width]",
        !collapsed && "md:w-56",
      )}
    >
      <div className="flex h-14 items-center justify-center overflow-hidden border-b px-2">
        {/* Icons-only shows just the left (panel) part of the logo. */}
        <img
          src="/logo.webp"
          alt="Gunda Power"
          className={cn("h-9 w-9 object-cover object-left", !collapsed && "md:h-10 md:w-auto md:object-contain")}
        />
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                !collapsed && "md:justify-start",
                isActive
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )
            }
          >
            <Icon className="size-4 shrink-0" />
            <span className={showLabels}>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="hidden border-t p-2 md:block">
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            !collapsed && "justify-start",
          )}
        >
          {collapsed ? <PanelLeftOpenIcon className="size-4 shrink-0" /> : <PanelLeftCloseIcon className="size-4 shrink-0" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
