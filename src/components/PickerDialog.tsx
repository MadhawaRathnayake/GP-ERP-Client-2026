import type { RowData, TableOptions } from "@tanstack/react-table"
import { ChevronsUpDownIcon } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"
import { useSearchParams } from "react-router-dom"

import { DataGrid, type GridFeatures } from "@/components/DataGrid"
import { SearchInput } from "@/components/SearchInput"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface PickerDialogProps<T extends RowData> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  searchPlaceholder: string
  columns: TableOptions<GridFeatures, T>["columns"]
  // A cached master-data list (useProducts(), useCustomers(), …), already narrowed to what may be picked.
  query: { data: T[] | undefined; isPending: boolean; error: Error | null }
  // Plural name for the grid's messages, e.g. "customers".
  label: string
  getRowId: (row: T) => string
  // The button at the end of each row (Select, Add, …).
  rowAction: (row: T) => ReactNode
  // Extra controls next to the search box (e.g. category filters).
  filters?: ReactNode
}

// Choosing a product, customer or supplier: a search box and the same grid as the list pages (search, sort, pages,
// all in the browser over the cached list). Its search and grid state are under `picker.` in the URL, apart from the
// page's own search; closing the dialog clears them.
export function PickerDialog<T extends RowData>({
  open,
  onOpenChange,
  title,
  description,
  searchPlaceholder,
  columns,
  query,
  label,
  getRowId,
  rowAction,
  filters,
}: PickerDialogProps<T>) {
  const [, setSearchParams] = useSearchParams()

  const changeOpen = (next: boolean) => {
    if (!next) {
      setSearchParams(
        (params) => {
          const kept = new URLSearchParams(params)
          for (const key of [...kept.keys()]) {
            if (key.startsWith("picker.")) kept.delete(key)
          }
          return kept
        },
        { replace: true },
      )
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[90vh] grid-rows-[auto_auto_minmax(0,1fr)] sm:max-w-7xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput placeholder={searchPlaceholder} param="picker.q" />
          {filters}
        </div>
        <div className="min-h-0 overflow-auto">
          {/* Mounted only while open, so a closed picker doesn't sort or filter thousands of rows. */}
          {open && (
            <DataGrid
              columns={columns}
              query={query}
              label={label}
              getRowId={getRowId}
              urlKey="picker"
              searchParam="picker.q"
              rowActions={rowAction}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// A form field that opens a picker: looks like a select box and shows the chosen record. Spreads the rest of its
// props onto the button, so <FormControl> can give it its id and aria attributes.
export function PickerField({
  children,
  placeholder,
  className,
  ...props
}: Omit<ComponentProps<"button">, "type"> & { placeholder: string }) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm shadow-xs transition-colors outline-none hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30",
        className,
      )}
      {...props}
    >
      <span className={cn("min-w-0 truncate", !children && "text-muted-foreground")}>{children || placeholder}</span>
      <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
    </button>
  )
}
