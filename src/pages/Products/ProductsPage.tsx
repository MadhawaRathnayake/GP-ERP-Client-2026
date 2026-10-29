import { createColumnHelper } from "@tanstack/react-table"
import { PlusIcon } from "lucide-react"
import { useMemo } from "react"
import { Link } from "react-router-dom"

import { useCan } from "@/app/auth"
import { useFormat } from "@/app/settings"
import { DataGrid, type GridFeatures } from "@/components/DataGrid"
import { SearchInput } from "@/components/SearchInput"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"

import { useProducts } from "./api"
import type { Product } from "./types"

const columnHelper = createColumnHelper<GridFeatures, Product>()

export function ProductsPage() {
  const can = useCan()
  const format = useFormat()
  const products = useProducts()

  // Rebuilt only when the currency changes.
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("sku", {
          header: "SKU",
          cell: (info) => (
            <Link to={`/products/${info.row.original.id}`} className="font-medium hover:underline">
              {info.getValue()}
            </Link>
          ),
        }),
        columnHelper.accessor("name", { header: "Name" }),
        columnHelper.accessor("status", {
          header: "Status",
          cell: (info) => <span className="capitalize">{info.getValue()}</span>,
        }),
        columnHelper.accessor("price", { header: "Price", cell: (info) => format.money(info.getValue()) }),
        columnHelper.accessor("cost", { header: "Cost", cell: (info) => format.money(info.getValue()) }),
        columnHelper.accessor("stock", { header: "Stock" }),
      ]),
    [format],
  )

  return (
    <div className="space-y-4">
      <TopBarActions>
        <SearchInput placeholder="Search products…" />
        {can("PRODUCTS.CREATE") && (
          <Button asChild>
            <Link to="/products/new">
              <PlusIcon />
              Create new
            </Link>
          </Button>
        )}
      </TopBarActions>
      <h1 className="text-2xl font-semibold">Products</h1>
      <DataGrid
        columns={columns}
        query={products}
        label="products"
        getRowId={(product) => product.id}
        rowHref={(product) => `/products/${product.id}`}
      />
    </div>
  )
}
