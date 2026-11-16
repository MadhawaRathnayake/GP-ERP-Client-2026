import { createColumnHelper } from "@tanstack/react-table"
import { PlusIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { useCan } from "@/app/auth"
import { DataGrid, type GridFeatures } from "@/components/DataGrid"
import { SearchInput } from "@/components/SearchInput"
import { TopBarButton } from "@/components/TopBarButton"
import { TopBarActions } from "@/components/TopBarActions"

import { useCustomers } from "./api"
import type { Customer } from "./types"

const columnHelper = createColumnHelper<GridFeatures, Customer>()

// Every accessor column is searchable, so the search box also finds customers by city and district.
const columns = columnHelper.columns([
  columnHelper.accessor("code", {
    header: "Code",
    cell: (info) => (
      <Link to={`/customers/${info.row.original.id}`} className="font-medium hover:underline">
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor("name", { header: "Name" }),
  columnHelper.accessor("type", { header: "Type" }),
  columnHelper.accessor((customer) => customer.phones.join(", "), { id: "phones", header: "Phones" }),
  columnHelper.accessor((customer) => customer.email ?? "", { id: "email", header: "Email" }),
  columnHelper.accessor((customer) => customer.city ?? "", { id: "city", header: "City" }),
  columnHelper.accessor((customer) => customer.district ?? "", { id: "district", header: "District" }),
])

export function CustomersPage() {
  const can = useCan()
  const customers = useCustomers()

  return (
    <div className="space-y-4">
      <TopBarActions>
        {/* Hidden on phones: the search box and button need the room, and the sidebar names the page. */}
        <h1 className="mr-2 hidden text-2xl font-semibold tracking-tight sm:block">Customers</h1>
        <SearchInput placeholder="Search name, city, district…" />
        {can("CUSTOMERS.CREATE") && (
          <TopBarButton tone="main" to="/customers/create" icon={PlusIcon} label="Create new" />
        )}
      </TopBarActions>
      <DataGrid
        columns={columns}
        query={customers}
        label="customers"
        getRowId={(customer) => customer.id}
        rowHref={(customer) => `/customers/${customer.id}`}
      />
    </div>
  )
}
