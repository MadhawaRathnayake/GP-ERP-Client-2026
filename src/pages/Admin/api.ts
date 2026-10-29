import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { http } from "@/lib/http"

import type { NewRole, NewUser, Permission, Role, RoleUpdate, User, UserUpdate } from "./types"

// Includes deactivated users so they can be found and reactivated.
export async function fetchUsers(): Promise<User[]> {
  const { data } = await http.get<User[]>("/users", { params: { includeInactive: true } })
  return data
}

export async function fetchUser(id: string): Promise<User> {
  const { data } = await http.get<User>(`/users/${id}`)
  return data
}

export async function createUser(newUser: NewUser): Promise<User> {
  const { data } = await http.post<User>("/users", newUser)
  return data
}

export async function updateUser({ id, ...changes }: UserUpdate): Promise<User> {
  const { data } = await http.patch<User>(`/users/${id}`, changes)
  return data
}

export async function fetchRoles(): Promise<Role[]> {
  const { data } = await http.get<Role[]>("/roles")
  return data
}

export async function fetchRole(id: string): Promise<Role> {
  const { data } = await http.get<Role>(`/roles/${id}`)
  return data
}

export async function createRole(newRole: NewRole): Promise<Role> {
  const { data } = await http.post<Role>("/roles", newRole)
  return data
}

export async function updateRole({ id, ...changes }: RoleUpdate): Promise<Role> {
  const { data } = await http.patch<Role>(`/roles/${id}`, changes)
  return data
}

export async function fetchPermissions(): Promise<Permission[]> {
  const { data } = await http.get<Permission[]>("/permissions")
  return data
}

export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: fetchUsers })
}

export function useUser(id: string) {
  return useQuery({ queryKey: ["users", id], queryFn: () => fetchUser(id) })
}

export function useRoles() {
  return useQuery({ queryKey: ["roles"], queryFn: fetchRoles })
}

export function useRole(id: string) {
  return useQuery({ queryKey: ["roles", id], queryFn: () => fetchRole(id) })
}

// Defined in the server's code, so they rarely change.
export function usePermissions() {
  return useQuery({ queryKey: ["permissions"], queryFn: fetchPermissions, staleTime: 30 * 60_000 })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createUser,
    onSuccess: (user) => {
      void queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success(`Created user ${user.name}`)
    },
    onError: (error) => {
      toast.error(`Could not create user: ${error.message}`)
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateUser,
    onSuccess: (user) => {
      void queryClient.invalidateQueries({ queryKey: ["users"] })
      // The signed-in user may have changed their own name or role.
      void queryClient.invalidateQueries({ queryKey: ["me"] })
      toast.success(`Saved changes for ${user.name}`)
    },
    onError: (error) => {
      toast.error(`Could not save changes: ${error.message}`)
    },
  })
}

export function useCreateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createRole,
    onSuccess: (role) => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] })
      toast.success(`Created role "${role.name}"`)
    },
    onError: (error) => {
      toast.error(`Could not create role: ${error.message}`)
    },
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateRole,
    onSuccess: (role) => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] })
      // Users show their role's name, and the signed-in user's permissions may come from this role.
      void queryClient.invalidateQueries({ queryKey: ["users"] })
      void queryClient.invalidateQueries({ queryKey: ["me"] })
      toast.success(`Saved changes for role "${role.name}"`)
    },
    onError: (error) => {
      toast.error(`Could not save role: ${error.message}`)
    },
  })
}
