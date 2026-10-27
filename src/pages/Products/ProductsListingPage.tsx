import { PlusIcon } from "lucide-react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { DataTable, type Column } from "@/components/DataTable"
import { SearchInput } from "@/components/SearchInput"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"
import { useProducts } from "@/hooks/useProducts"
import type { Product } from "@/types/product"

const columns: Column<Product>[] = [
  { header: "SKU", cell: (product) => <span className="font-medium">{product.sku}</span> },
  { header: "Price", cell: (product) => product.price.toLocaleString() },
  { header: "Cost", cell: (product) => product.cost.toLocaleString() },
  { header: "Stock", cell: (product) => product.stock },
]

export function ProductsListingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const q = searchParams.get("q") ?? ""
  const { data, isPending, isError, error } = useProducts(q)

  return (
    <div className="space-y-4">
      <TopBarActions>
        <SearchInput />
        <Button asChild>
          <Link to="/products/new">
            <PlusIcon />
            Create new
          </Link>
        </Button>
      </TopBarActions>
      <h1 className="text-2xl font-semibold">Products</h1>
      {isPending ? (
        <p className="text-sm text-muted-foreground">Loading products…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">Could not load products: {error.message}</p>
      ) : data.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{q ? `No products match "${q}".` : "No products yet."}</p>
      ) : (
        <>
          <DataTable columns={columns} data={data.data} onRowClick={(product) => navigate(`/products/${product.id}`)} />
          {data.total > data.data.length && (
            <p className="text-sm text-muted-foreground">
              Showing {data.data.length} of {data.total}. Search by SKU to narrow down.
            </p>
          )}
        </>
      )}
    </div>
  )
}
