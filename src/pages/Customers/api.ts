import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { fetchAll, http } from "@/lib/http"

import type { Customer, CustomerUpdate, NewCustomer } from "./types"

// Every active customer, so the grid can search, sort and page across all of them in the browser.
export function fetchCustomers(): Promise<Customer[]> {
  return fetchAll<Customer>("/customers")
}

export async function fetchCustomer(id: string): Promise<Customer> {
  const { data } = await http.get<Customer>(`/customers/${id}`)
  return data
}

export async function createCustomer(newCustomer: NewCustomer): Promise<Customer> {
  const { data } = await http.post<Customer>("/customers", newCustomer)
  return data
}

export async function updateCustomer({ id, ...changes }: CustomerUpdate): Promise<Customer> {
  const { data } = await http.patch<Customer>(`/customers/${id}`, changes)
  return data
}

// Soft delete: the server sets isDeleted = true. `updateCustomer({ id, isDeleted: false })` restores it.
export async function deleteCustomer(id: string): Promise<void> {
  await http.delete(`/customers/${id}`)
}

export function useCustomers() {
  // The full list is several requests and customers change rarely, so keep it for a while between visits.
  return useQuery({ queryKey: ["customers", "list"], queryFn: fetchCustomers, staleTime: 15 * 60_000, gcTime: 30 * 60_000 })
}

export function useCustomer(id: string) {
  return useQuery({ queryKey: ["customers", "detail", id], queryFn: () => fetchCustomer(id) })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: (customer) => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] })
      toast.success(`Created customer "${customer.name}"`)
    },
    onError: (error) => {
      toast.error(`Could not create customer: ${error.message}`)
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateCustomer,
    onSuccess: (customer) => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] })
      toast.success(`Saved customer "${customer.name}"`)
    },
    onError: (error) => {
      toast.error(`Could not save customer: ${error.message}`)
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] })
      toast.success("Deleted the customer")
    },
    onError: (error) => {
      toast.error(`Could not delete customer: ${error.message}`)
    },
  })
}
