import { Loader2Icon } from "lucide-react"
import { useState } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"

import { loginPath, useMe } from "@/app/auth"
import { Sidebar } from "@/app/layout/Sidebar"
import { TopBar } from "@/app/layout/TopBar"
import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/http"
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

// Every page inside the layout needs a signed-in user; without one it goes to /login and comes back afterwards.
export function AppLayout() {
  const me = useMe()
  const location = useLocation()
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

  if (me.isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Loading…
      </div>
    )
  }
  // Only 401 means "signed out"; server errors and an unreachable server show a retry instead.
  if (me.error instanceof ApiError && me.error.status === 401) {
    return <Navigate to={loginPath(location.pathname + location.search)} replace />
  }
  if (me.isError) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-destructive">Could not load your account: {me.error.message}</p>
        <Button variant="outline" size="sm" onClick={() => void me.refetch()}>
          Try again
        </Button>
      </div>
    )
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
