import { createColumnHelper } from "@tanstack/react-table"
import { CableIcon, PlusIcon, TagsIcon } from "lucide-react"
import { useMemo } from "react"
import { Link } from "react-router-dom"

import { useCan } from "@/app/auth"
import { DataGrid, type GridFeatures } from "@/components/DataGrid"
import { SearchInput } from "@/components/SearchInput"
import { TopBarButton } from "@/components/TopBarButton"
import { TopBarActions } from "@/components/TopBarActions"
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
        {/* Hidden on phones: the search box and button need the room, and the sidebar names the page. */}
        <h1 className="mr-2 hidden text-2xl font-semibold tracking-tight sm:block">Products</h1>
        <SearchInput placeholder="Search products…" />
      {can("CATEGORY.VIEW") && (<TopBarButton to="/products/categories" icon={TagsIcon} label="Categories" />)}
        {can("ACCESSORIES.VIEW") && (
          <TopBarButton to="/products/accessories" icon={CableIcon} label="Accessories" />
        )}
        {can("PRODUCTS.CREATE") && (
          <TopBarButton tone="main" to="/products/create" icon={PlusIcon} label="Create new" />
        )}
      </TopBarActions>
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
