import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { createAccount, createRole, fetchAccounts, fetchRoles } from "@/api/client"

export function useAccounts() {
  return useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts })
}

export function useRoles() {
  return useQuery({ queryKey: ["roles"], queryFn: fetchRoles })
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
