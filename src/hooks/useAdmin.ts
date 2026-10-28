import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  createAccount,
  createRole,
  fetchAccount,
  fetchAccounts,
  fetchRole,
  fetchRoles,
  updateAccount,
  updateRole,
} from "@/api/client"

export function useAccounts() {
  return useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts })
}

export function useAccount(id: string) {
  return useQuery({ queryKey: ["accounts", id], queryFn: () => fetchAccount(id) })
}

export function useRoles() {
  return useQuery({ queryKey: ["roles"], queryFn: fetchRoles })
}

export function useRole(id: string) {
  return useQuery({ queryKey: ["roles", id], queryFn: () => fetchRole(id) })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateRole,
    onSuccess: (role) => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] })
      toast.success(`Saved changes for role "${role.name}"`)
    },
    onError: (error) => {
      toast.error(`Could not save role: ${error.message}`)
    },
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createAccount,
    onSuccess: (account) => {
      void queryClient.invalidateQueries({ queryKey: ["accounts"] })
      toast.success(`Created profile for ${account.name}`)
    },
    onError: (error) => {
      toast.error(`Could not create profile: ${error.message}`)
    },
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateAccount,
    onSuccess: (account) => {
      void queryClient.invalidateQueries({ queryKey: ["accounts"] })
      toast.success(`Saved changes for ${account.name}`)
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
