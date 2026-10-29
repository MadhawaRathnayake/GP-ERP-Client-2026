import { useQuery } from "@tanstack/react-query"

import { fetchAll, http } from "@/lib/http"

import type { Customer } from "./types"

// Every customer, so the grid can search, sort and page across all of them in the browser.
export function fetchCustomers(): Promise<Customer[]> {
  return fetchAll<Customer>("/customers")
}

export async function fetchCustomer(id: string): Promise<Customer> {
  const { data } = await http.get<Customer>(`/customers/${id}`)
  return data
}

export function useCustomers() {
  return useQuery({ queryKey: ["customers", "list"], queryFn: fetchCustomers, staleTime: 5 * 60_000 })
}

export function useCustomer(id: string) {
  return useQuery({ queryKey: ["customers", "detail", id], queryFn: () => fetchCustomer(id) })
}
