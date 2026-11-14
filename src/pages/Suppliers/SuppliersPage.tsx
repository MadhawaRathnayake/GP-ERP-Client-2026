import { createColumnHelper } from "@tanstack/react-table"
import { PlusIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { useCan } from "@/app/auth"
import { DataGrid, type GridFeatures } from "@/components/DataGrid"
import { SearchInput } from "@/components/SearchInput"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"
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
        <SearchInput placeholder="Search suppliers…" />
        {can("SUPPLIERS.CREATE") && (
          <Button asChild>
            <Link to="/suppliers/create">
              <PlusIcon />
              Create new
            </Link>
          </Button>
        )}
      </TopBarActions>
      <h1 className="text-2xl font-semibold">Suppliers</h1>
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
