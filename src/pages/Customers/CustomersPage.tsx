import { createColumnHelper } from "@tanstack/react-table"
import { PlusIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { useCan } from "@/app/auth"
import { DataGrid, type GridFeatures } from "@/components/DataGrid"
import { SearchInput } from "@/components/SearchInput"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"

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
        <SearchInput placeholder="Search name, city, district…" />
        {can("CUSTOMERS.CREATE") && (
          <Button asChild>
            <Link to="/customers/create">
              <PlusIcon />
              Create new
            </Link>
          </Button>
        )}
      </TopBarActions>
      <h1 className="text-2xl font-semibold">Customers</h1>
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
