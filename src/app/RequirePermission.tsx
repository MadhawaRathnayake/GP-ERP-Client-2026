import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"

import { useCan, type PermissionKey } from "@/app/auth"
import { homePage } from "@/app/layout/navigation"
import { NoAccessPage } from "@/components/StatusView"

interface RequirePermissionProps {
  permission: PermissionKey
  // Send users without the permission to their first screen instead of showing "no access" (used for `/`).
  redirect?: boolean
  children: ReactNode
}

// Route guard: shows the page only when the user's role has `permission`. The server enforces the same rule.
export function RequirePermission({ permission, redirect = false, children }: RequirePermissionProps) {
  const can = useCan()
  if (can(permission)) return children
  if (redirect) return <Navigate to={homePage(can).to} replace />
  return <NoAccessPage />
}
