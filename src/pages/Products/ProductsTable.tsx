import {
  createColumnHelper,
  rowPaginationFeature,
  tableFeatures,
  useTable,
  type PaginationState,
  type Updater,
} from "@tanstack/react-table"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { Product } from "@/types/product"

// The API filters, pages and counts on the server, so the only client feature needed is pagination
// state; no create*RowModel slot is registered because manualPagination bypasses client slicing.
const features = tableFeatures({ rowPaginationFeature })
const columnHelper = createColumnHelper<typeof features, Product>()

const columns = columnHelper.columns([
  columnHelper.accessor("sku", {
    header: "SKU",
    cell: (info) => (
      <Link
        to={`/products/${info.row.original.id}`}
        onClick={(event) => event.stopPropagation()}
        className="font-medium hover:underline"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor("price", { header: "Price", cell: (info) => info.getValue().toLocaleString() }),
  columnHelper.accessor("cost", { header: "Cost", cell: (info) => info.getValue().toLocaleString() }),
  columnHelper.accessor("stock", { header: "Stock" }),
])

const noProducts: Product[] = []

interface ProductsTableProps {
  data: Product[] | undefined
  rowCount: number | undefined
  pagination: PaginationState
  onPaginationChange: (updater: Updater<PaginationState>) => void
  isStale: boolean
}

export function ProductsTable({ data, rowCount, pagination, onPaginationChange, isStale }: ProductsTableProps) {
  const navigate = useNavigate()
  // Pagination is a controlled slice owned by the URL. The owner selects no state, so only the pager re-renders on page change.
  const table = useTable(
    {
      features,
      columns,
      data: data ?? noProducts,
      rowCount,
      manualPagination: true,
      state: { pagination },
      onPaginationChange,
    },
    () => ({}),
  )

  return (
    <div className="space-y-4">
      <Table className={cn(isStale && "opacity-60")}>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead key={header.id}>{header.isPlaceholder ? null : <table.FlexRender header={header} />}</TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate(`/products/${row.original.id}`)}>
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id}>
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <table.Subscribe selector={(state) => state.pagination}>
        {({ pageIndex }) => (
          <nav aria-label="Pagination" className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {pageIndex + 1} of {Math.max(table.getPageCount(), 1)} · {rowCount?.toLocaleString() ?? 0} products
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeftIcon />
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                Next
                <ChevronRightIcon />
              </Button>
            </div>
          </nav>
        )}
      </table.Subscribe>
    </div>
  )
}
