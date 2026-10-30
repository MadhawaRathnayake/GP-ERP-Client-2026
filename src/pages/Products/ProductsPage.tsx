import { createColumnHelper } from "@tanstack/react-table"
import { PlusIcon, TagsIcon } from "lucide-react"
import { useMemo } from "react"
import { Link } from "react-router-dom"

import { useCan } from "@/app/auth"
import { DataGrid, type GridFeatures } from "@/components/DataGrid"
import { SearchInput } from "@/components/SearchInput"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"
import { useCategories } from "@/pages/Categories/api"

import { useProducts } from "./api"
import type { Product } from "./types"

const columnHelper = createColumnHelper<GridFeatures, Product>()

const trackingLabels = { quantity: "Quantity", serial: "Serial" }

export function ProductsPage() {
  const can = useCan()
  const products = useProducts()
  const categories = useCategories()

  // Rebuilt only when the categories load, so the Category column shows (and searches) names.
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
        columnHelper.accessor("title", { header: "Title" }),
        columnHelper.accessor(
          (product) => categories.data?.find((category) => category.id === product.categoryId)?.name ?? product.categoryId,
          { id: "category", header: "Category" },
        ),
        columnHelper.accessor((product) => trackingLabels[product.trackingType], { id: "tracking", header: "Tracking" }),
        columnHelper.accessor("warrantyMonths", { header: "Warranty (months)" }),
        columnHelper.accessor("stockInHand", { header: "In hand" }),
        columnHelper.accessor("minimumStock", { header: "Min stock" }),
      ]),
    [categories.data],
  )

  return (
    <div className="space-y-4">
      <TopBarActions>
        <SearchInput placeholder="Search products…" />
      {can("CATEGORY.VIEW") && (<Button variant="outline" asChild>
          <Link to="/products/categories">
            <TagsIcon />
            Categories
          </Link>
        </Button>)}
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
