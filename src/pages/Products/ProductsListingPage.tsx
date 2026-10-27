import type { PaginationState, Updater } from "@tanstack/react-table"
import { PlusIcon } from "lucide-react"
import { useMemo } from "react"
import { Link, useSearchParams } from "react-router-dom"

import { SearchInput } from "@/components/SearchInput"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"
import { useProducts } from "@/hooks/useProducts"

import { ProductsTable } from "./ProductsTable"

const PAGE_SIZE = 100

export function ProductsListingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get("q") ?? ""
  const pageIndex = Math.max((Number.parseInt(searchParams.get("page") ?? "1", 10) || 1) - 1, 0)
  const pagination = useMemo<PaginationState>(() => ({ pageIndex, pageSize: PAGE_SIZE }), [pageIndex])
  const { data, isPending, isError, error, isPlaceholderData } = useProducts(q, pageIndex, PAGE_SIZE)

  // The page lives in the URL (?page=, 1-based); SearchInput drops it whenever the search text changes.
  const onPaginationChange = (updater: Updater<PaginationState>) => {
    const next = typeof updater === "function" ? updater(pagination) : updater
    setSearchParams(
      (params) => {
        const updated = new URLSearchParams(params)
        if (next.pageIndex > 0) updated.set("page", String(next.pageIndex + 1))
        else updated.delete("page")
        return updated
      },
      { replace: true },
    )
  }

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
        <ProductsTable
          data={data.data}
          rowCount={data.total}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          isStale={isPlaceholderData}
        />
      )}
    </div>
  )
}
