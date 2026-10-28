import {
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type PaginationState,
  type RowData,
  type SortingState,
  type TableOptions,
  type Updater,
} from "@tanstack/react-table"
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react"
import { useDeferredValue, useMemo, type ReactNode } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

// The whole list is loaded once; searching, sorting and paging all run in the browser on every row.
// The sort functions are the ones the `auto` sort picks from for text, numbers and dates.
const gridFeatures = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic, datetime: sortFn_datetime, text: sortFn_text },
})

// Pages build columns with `createColumnHelper<GridFeatures, Row>()`.
export type GridFeatures = typeof gridFeatures

const pageSizes = [25, 50, 100]
const noRows: never[] = []

interface DataGridProps<T extends RowData> {
  columns: TableOptions<GridFeatures, T>["columns"]
  // A TanStack Query result for the full list (e.g. `useProducts()`).
  query: { data: T[] | undefined; isPending: boolean; error: Error | null }
  // Plural name used in messages, e.g. "products".
  label: string
  // Clicking a row opens this URL.
  rowHref?: (row: T) => string
  // Buttons shown in an "Actions" column at the end of each row.
  rowActions?: (row: T) => ReactNode
  getRowId?: (row: T) => string
  // Prefixes the URL params (`<urlKey>.page`, …) when a page shows more than one grid.
  urlKey?: string
  defaultPageSize?: number
}

// Searches with the `?q=` URL param (set it with <SearchInput />) and keeps page, page size and sort in the URL.
// Every accessor column is sortable from its header and searchable; display columns are neither.
export function DataGrid<T extends RowData>({
  columns,
  query,
  label,
  rowHref,
  rowActions,
  getRowId,
  urlKey,
  defaultPageSize = 50,
}: DataGridProps<T>) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const param = (name: string) => (urlKey ? `${urlKey}.${name}` : name)

  // Deferred so typing stays responsive while thousands of rows are filtered.
  const search = useDeferredValue((searchParams.get("q") ?? "").trim())
  const sortParam = searchParams.get(param("sort")) ?? ""
  const sizeParam = Number(searchParams.get(param("size")))
  const pageSize = pageSizes.includes(sizeParam) ? sizeParam : defaultPageSize
  const pageIndex = Math.max((Number.parseInt(searchParams.get(param("page")) ?? "1", 10) || 1) - 1, 0)

  const sorting = useMemo<SortingState>(
    () => (sortParam ? [{ id: sortParam.replace(/^-/, ""), desc: sortParam.startsWith("-") }] : []),
    [sortParam],
  )
  const pagination = useMemo<PaginationState>(() => ({ pageIndex, pageSize }), [pageIndex, pageSize])

  const setParams = (changes: Record<string, string | undefined>) => {
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params)
        for (const [name, value] of Object.entries(changes)) {
          if (value) next.set(param(name), value)
          else next.delete(param(name))
        }
        return next
      },
      { replace: true },
    )
  }

  const onSortingChange = (updater: Updater<SortingState>) => {
    const [sort] = typeof updater === "function" ? updater(sorting) : updater
    setParams({ sort: sort && `${sort.desc ? "-" : ""}${sort.id}`, page: undefined })
  }

  const onPaginationChange = (updater: Updater<PaginationState>) => {
    const next = typeof updater === "function" ? updater(pagination) : updater
    setParams({
      page: next.pageIndex > 0 ? String(next.pageIndex + 1) : undefined,
      size: next.pageSize !== defaultPageSize ? String(next.pageSize) : undefined,
    })
  }

  const data = query.data ?? noRows
  // All state is owned by the URL, so the grid re-renders through its props and selects nothing from the store.
  const table = useTable(
    {
      features: gridFeatures,
      columns,
      data,
      getRowId,
      state: { globalFilter: search, sorting, pagination },
      onSortingChange,
      onPaginationChange,
      enableMultiSort: false,
      // Keep a shared ?page= link intact when the data finishes loading.
      autoResetPageIndex: false,
    },
    () => ({}),
  )

  if (query.isPending) return <p className="text-sm text-muted-foreground">Loading {label}…</p>
  if (query.error) {
    return (
      <p className="text-sm text-destructive">
        Could not load {label}: {query.error.message}
      </p>
    )
  }
  if (data.length === 0) return <p className="text-sm text-muted-foreground">No {label} yet.</p>

  const matchCount = table.getFilteredRowModel().rows.length
  if (matchCount === 0) {
    return <p className="text-sm text-muted-foreground">No {label} match "{search}".</p>
  }

  const rows = table.getRowModel().rows
  const pageCount = Math.max(table.getPageCount(), 1)
  const from = Math.min(pageIndex * pageSize + 1, matchCount)
  const to = Math.min((pageIndex + 1) * pageSize, matchCount)

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                const sorted = header.column.getIsSorted()
                return (
                  <TableHead
                    key={header.id}
                    aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2.5"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <table.FlexRender header={header} />
                        {sorted === "asc" ? (
                          <ArrowUpIcon />
                        ) : sorted === "desc" ? (
                          <ArrowDownIcon />
                        ) : (
                          <ArrowUpDownIcon className="text-muted-foreground" />
                        )}
                      </Button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                )
              })}
              {rowActions && <TableHead>Actions</TableHead>}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className={cn(rowHref && "cursor-pointer")}
              onClick={
                rowHref &&
                ((event) => {
                  // Links, buttons and menus inside the row handle their own clicks.
                  if (event.target instanceof Element && event.target.closest("a, button, [role=menuitem]")) return
                  navigate(rowHref(row.original))
                })
              }
            >
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id}>
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
              {rowActions && <TableCell>{rowActions(row.original)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {rows.length === 0 ? (
        <Button variant="outline" size="sm" onClick={() => table.firstPage()}>
          Go to the first page
        </Button>
      ) : (
        <nav
          aria-label="Pagination"
          className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"
        >
          <span>
            {from.toLocaleString()}–{to.toLocaleString()} of {matchCount.toLocaleString()} {label}
            {search && ` (filtered from ${data.length.toLocaleString()})`}
          </span>
          {matchCount > pageSizes[0] && (
            <div className="flex flex-wrap items-center gap-2">
              <span>Rows per page</span>
              <Select value={String(pageSize)} onValueChange={(value) => table.setPageSize(Number(value))}>
                <SelectTrigger size="sm" aria-label="Rows per page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizes.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>
                Page {pageIndex + 1} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="First page"
                onClick={() => table.firstPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeftIcon />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Previous page"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Next page"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRightIcon />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Last page"
                onClick={() => table.lastPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRightIcon />
              </Button>
            </div>
          )}
        </nav>
      )}
    </div>
  )
}
