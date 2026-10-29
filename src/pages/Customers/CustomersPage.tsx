import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { Link } from "react-router-dom"

import { useFormat } from "@/app/settings"
import { DataGrid, type GridFeatures } from "@/components/DataGrid"
import { SearchInput } from "@/components/SearchInput"
import { TopBarActions } from "@/components/TopBarActions"

import { useCustomers } from "./api"
import type { Customer } from "./types"

const columnHelper = createColumnHelper<GridFeatures, Customer>()

export function CustomersPage() {
  const format = useFormat()
  const customers = useCustomers()

  // Rebuilt only when the currency changes.
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("code", {
          header: "Code",
          cell: (info) => (
            <Link to={`/customers/${info.row.original.id}`} className="font-medium hover:underline">
              {info.getValue()}
            </Link>
          ),
        }),
        columnHelper.accessor("name", { header: "Name" }),
        columnHelper.accessor((customer) => customer.email ?? "", {
          id: "email",
          header: "Email",
          cell: (info) => info.getValue() || "—",
        }),
        columnHelper.accessor((customer) => customer.phone ?? "", {
          id: "phone",
          header: "Phone",
          cell: (info) => info.getValue() || "—",
        }),
        columnHelper.accessor("creditLimit", {
          header: "Credit limit",
          cell: (info) => format.money(info.getValue()),
        }),
      ]),
    [format],
  )

  return (
    <div className="space-y-4">
      <TopBarActions>
        <SearchInput placeholder="Search customers…" />
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
