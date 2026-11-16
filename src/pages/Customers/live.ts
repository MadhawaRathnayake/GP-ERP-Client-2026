import { liveList } from "@/app/liveList"
import { fetchCustomersByIds } from "./api"
import type { Customer } from "./types"

// The customers list, kept live by `customer` events (app/liveList.ts).
export const liveCustomers = liveList<Customer>({
  key: "customers",
  event: "customer",
  fetchByIds: fetchCustomersByIds,
})
