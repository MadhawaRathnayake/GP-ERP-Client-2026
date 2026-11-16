import { createColumnHelper } from "@tanstack/react-table"
import { PlusIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { useCan } from "@/app/auth"
import { DataGrid, type GridFeatures } from "@/components/DataGrid"
import { SearchInput } from "@/components/SearchInput"
import { TopBarButton } from "@/components/TopBarButton"
import { TopBarActions } from "@/components/TopBarActions"
import { CountryName } from "@/pages/Countries/CountrySelect"

import { useSuppliers } from "./api"
import type { Supplier } from "./types"

const columnHelper = createColumnHelper<GridFeatures, Supplier>()

const columns = columnHelper.columns([
  columnHelper.accessor("code", {
    header: "Code",
    cell: (info) => (
      <Link to={`/suppliers/${info.row.original.id}`} className="font-medium hover:underline">
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor("name", { header: "Name" }),
  columnHelper.accessor((supplier) => supplier.phones.join(", "), { id: "phones", header: "Phones" }),
  columnHelper.accessor((supplier) => supplier.email ?? "", { id: "email", header: "Email" }),
  columnHelper.accessor((supplier) => supplier.city ?? "", { id: "city", header: "City" }),
  columnHelper.accessor("country", { header: "Country", cell: (info) => <CountryName code={info.getValue()} /> }),
])

export function SuppliersPage() {
  const can = useCan()
  const suppliers = useSuppliers()

  return (
    <div className="space-y-4">
      <TopBarActions>
        {/* Hidden on phones: the search box and button need the room, and the sidebar names the page. */}
        <h1 className="mr-2 hidden text-2xl font-semibold tracking-tight sm:block">Suppliers</h1>
        <SearchInput placeholder="Search suppliers…" />
        {can("SUPPLIERS.CREATE") && (
          <TopBarButton tone="main" to="/suppliers/create" icon={PlusIcon} label="Create new" />
        )}
      </TopBarActions>
      <DataGrid
        columns={columns}
        query={suppliers}
        label="suppliers"
        getRowId={(supplier) => supplier.id}
        rowHref={(supplier) => `/suppliers/${supplier.id}`}
      />
    </div>
  )
}
