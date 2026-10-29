import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"

import { http } from "@/lib/http"

// Mirrors PERMISSIONS in GP-ERP-Server/src/platform/security/permissions.ts. A screen shows when the user has <SCREEN>.VIEW.
export type PermissionKey =
  | "DASHBOARD.VIEW"
  | "PRODUCTS.VIEW"
  | "PRODUCTS.CREATE"
  | "PRODUCTS.EDIT"
  | "PRODUCTS.DELETE"
  | "CUSTOMERS.VIEW"
  | "REPORTS.VIEW"
  | "ADMIN.VIEW"
  | "ADMIN.MANAGE_USERS"
  | "ADMIN.MANAGE_ROLES"
  | "ADMIN.EDIT_SETTINGS"

export interface CurrentUser {
  id: string
  name: string
  email: string
  roleId: string
  roleName: string
  permissions: PermissionKey[]
}

export interface LoginBody {
  email: string
  password: string
}

async function fetchMe(): Promise<CurrentUser> {
  const { data } = await http.get<CurrentUser>("/auth/me")
  return data
}

// A 401 means "not signed in", so it is not retried. Refetches on window focus pick up role changes.
export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: fetchMe, retry: false })
}

// `can("PRODUCTS.DELETE")` → whether to show that screen or button. The server enforces the same rules.
export function useCan() {
  const { data } = useMe()
  return (permission: PermissionKey) => data?.permissions.includes(permission) ?? false
}

// The login URL that comes back to `returnTo` (path + search) after signing in.
export function loginPath(returnTo: string) {
  return returnTo === "/" ? "/login" : `/login?redirect=${encodeURIComponent(returnTo)}`
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: LoginBody) => (await http.post<CurrentUser>("/auth/login", body)).data,
    onSuccess: (user) => queryClient.setQueryData(["me"], user),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => http.post("/auth/logout"),
    // The server always ends the session, so leave the app even if the request failed (e.g. offline).
    onSettled: () => {
      navigate("/login", { replace: true })
      queryClient.clear()
    },
  })
}
