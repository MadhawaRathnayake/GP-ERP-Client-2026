import { createColumnHelper } from "@tanstack/react-table"
import { PlusIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { DataGrid, type GridFeatures } from "@/components/DataGrid"
import { SearchInput } from "@/components/SearchInput"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"

import { useProducts } from "./api"
import type { Product } from "./types"

const columnHelper = createColumnHelper<GridFeatures, Product>()

const columns = columnHelper.columns([
  columnHelper.accessor("sku", {
    header: "SKU",
    cell: (info) => (
      <Link to={`/products/${info.row.original.id}`} className="font-medium hover:underline">
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor("price", { header: "Price", cell: (info) => info.getValue().toLocaleString() }),
  columnHelper.accessor("cost", { header: "Cost", cell: (info) => info.getValue().toLocaleString() }),
  columnHelper.accessor("stock", { header: "Stock" }),
])

export function ProductsPage() {
  const products = useProducts()

  return (
    <div className="space-y-4">
      <TopBarActions>
        <SearchInput placeholder="Search products…" />
        <Button asChild>
          <Link to="/products/new">
            <PlusIcon />
            Create new
          </Link>
        </Button>
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
