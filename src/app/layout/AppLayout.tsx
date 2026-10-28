import { useState } from "react"
import { Outlet } from "react-router-dom"

import { Sidebar } from "@/app/layout/Sidebar"
import { TopBar } from "@/app/layout/TopBar"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "sidebar-collapsed"

// Storage can be unavailable (private mode, blocked site data); the sidebar then just starts expanded.
function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(readCollapsed)

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      try {
        localStorage.setItem(STORAGE_KEY, String(!current))
      } catch {
        // Not remembered across reloads; nothing else to do.
      }
      return !current
    })
  }

  return (
    <div className="min-h-svh">
      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      <div className={cn("pl-14 transition-[padding]", !collapsed && "md:pl-56")}>
        <TopBar />
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
