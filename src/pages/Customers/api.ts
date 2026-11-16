import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { mergeRows } from "@/app/liveList"
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

// The rows of the customers a live event named (at most 100), deleted ones included. Not cached by the server, so
// never older than the event.
export async function fetchCustomersByIds(ids: string[]): Promise<Customer[]> {
  const { data } = await http.get<Customer[]>("/customers/by-ids", { params: { ids: ids.join(",") } })
  return data
}

// Every customer that isn't deleted, loaded once per session and then kept up to date by the live stream (./live.ts),
// so it never goes stale.
export function useCustomers() {
  return useQuery({ queryKey: ["customers", "list"], queryFn: fetchCustomers, staleTime: Infinity, gcTime: Infinity })
}

export function useCustomer(id: string) {
  return useQuery({ queryKey: ["customers", "detail", id], queryFn: () => fetchCustomer(id) })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: (customer) => {
      queryClient.setQueryData<Customer[]>(["customers", "list"], (list) => list && mergeRows(list, [customer]))
      void queryClient.invalidateQueries({ queryKey: ["customers", "detail"] })
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
      queryClient.setQueryData<Customer[]>(["customers", "list"], (list) => list && mergeRows(list, [customer]))
      void queryClient.invalidateQueries({ queryKey: ["customers", "detail"] })
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
    onSuccess: (_, id) => {
      queryClient.setQueryData<Customer[]>(["customers", "list"], (list) => list?.filter((customer) => customer.id !== id))
      void queryClient.invalidateQueries({ queryKey: ["customers", "detail"] })
      toast.success("Deleted the customer")
    },
    onError: (error) => {
      toast.error(`Could not delete customer: ${error.message}`)
    },
  })
}
