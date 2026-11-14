import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react"
import { Fragment } from "react"
import { NavLink } from "react-router-dom"

import { useCan } from "@/app/auth"
import { appPages, canOpen } from "@/app/layout/navigation"
import { cn } from "@/lib/utils"

// Below `md` the sidebar is always icons-only, so it never covers the page on phones.
// From `md` up, `collapsed` switches between icons-only and full width.
export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const can = useCan()
  const showLabels = collapsed ? "sr-only" : "sr-only md:not-sr-only"

  return (
    <aside
      data-ui="sidebar"
      className={cn(
        "fixed inset-y-0 left-0 z-20 flex w-14 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width]",
        !collapsed && "md:w-56",
      )}
    >
      <div className="flex h-14 items-center justify-center overflow-hidden border-b px-2">
        {/* Icons-only shows just the left (panel) part of the logo. Dark mode has its own logo, readable on dark. */}
        <img
          src="/logo.webp"
          alt="Gunda Power"
          className={cn("h-9 w-9 object-cover object-left dark:hidden", !collapsed && "md:h-10 md:w-auto md:object-contain")}
        />
        <img
          src="/logo-dark.png"
          alt="Gunda Power"
          className={cn("hidden h-9 w-9 object-cover object-left dark:block", !collapsed && "md:h-10 md:w-auto md:object-contain")}
        />
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {appPages
          .filter((page) => canOpen(can, page.permission))
          .map(({ to, label, icon: Icon, end, section }, i, pages) => (
            <Fragment key={to}>
              {/* Heading where a new section starts; icons-only shows just a divider. */}
              {section && section !== pages[i - 1]?.section && (
                <div className={cn(!collapsed && "md:border-t-0")}>
                  <span className={cn(showLabels, "px-3 text-xs font-medium text-muted-foreground")}>{section}</span>
                </div>
              )}
            <NavLink
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
            </Fragment>
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
