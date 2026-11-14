import { createColumnHelper } from "@tanstack/react-table"
import { CheckIcon, ImageIcon, PlusIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { useFormat } from "@/app/settings"
import { DataGrid, type GridFeatures } from "@/components/DataGrid"
import { SearchInput } from "@/components/SearchInput"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useCategories } from "@/pages/Categories/api"
import { useProducts } from "@/pages/Products/api"
import { warrantyLabel, type Product } from "@/pages/Products/types"

const columnHelper = createColumnHelper<GridFeatures, Product>()

interface ProductPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Products already on the quotation; they show as added instead of offering Add again.
  addedIds: string[]
  onAdd: (product: Product) => void
}

// The product image, or a placeholder when it has none. Also used on the quotation form's lines.
export function ProductThumbnail({ src, alt }: { src: string | null; alt: string }) {
  return src ? (
    <img src={src} alt={alt} loading="lazy" className="size-16 object-contain" />
  ) : (
    <div className="flex size-16 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <ImageIcon className="size-6" />
    </div>
  )
}

// Search (the page's ?q=) and filter by category, then add products one by one. The dialog stays open so several
// products can be added; closing it clears its search and grid params from the URL.
export function ProductPickerDialog({ open, onOpenChange, addedIds, onAdd }: ProductPickerDialogProps) {
  const format = useFormat()
  const [, setSearchParams] = useSearchParams()
  const products = useProducts()
  const categories = useCategories()
  const [categoryId, setCategoryId] = useState("")

  const activeCategories = (categories.data ?? []).filter((category) => !category.isDeleted)
  const shown = (products.data ?? []).filter(
    (product) => !product.isDeleted && (!categoryId || product.categoryId === categoryId),
  )

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.display({
          id: "image",
          header: "Image",
          cell: (info) => <ProductThumbnail src={info.row.original.imageUrl} alt={info.row.original.title} />,
        }),
        columnHelper.accessor("sku", { header: "SKU" }),
        columnHelper.accessor("title", {
          header: "Product",
          cell: (info) => <div className="max-w-56 whitespace-normal">{info.getValue()}</div>,
        }),
        columnHelper.accessor((product) => product.description ?? "", {
          id: "description",
          header: "Description",
          cell: (info) => <div className="max-w-56 whitespace-normal">{info.getValue()}</div>,
        }),
        columnHelper.accessor(
          (product) => categories.data?.find((category) => category.id === product.categoryId)?.name ?? product.categoryId,
          { id: "category", header: "Category" },
        ),
        columnHelper.accessor((product) => product.manufacturer ?? "", {
          id: "manufacturer",
          header: "Manufacturer",
          cell: (info) => <div className="max-w-48 whitespace-normal">{info.getValue() || "—"}</div>,
        }),
        columnHelper.accessor("warrantyMonths", { header: "Warranty", cell: (info) => warrantyLabel(info.getValue()) }),
        columnHelper.accessor((product) => product.countryOfOrigin ?? "", {
          id: "countryOfOrigin",
          header: "Origin",
          cell: (info) => info.getValue() || "—",
        }),
        columnHelper.accessor("stockInHand", { header: "Stock" }),
        columnHelper.accessor("price", { header: "Price", cell: (info) => format.money(info.getValue()) }),
      ]),
    [categories.data, format],
  )

  const changeOpen = (next: boolean) => {
    if (!next) {
      setSearchParams(
        (params) => {
          const kept = new URLSearchParams(params)
          for (const key of [...kept.keys()]) {
            if (key === "q" || key.startsWith("picker.")) kept.delete(key)
          }
          return kept
        },
        { replace: true },
      )
    }
    onOpenChange(next)
  }

  const selectCategory = (id: string) => {
    setCategoryId(id)
    setSearchParams(
      (params) => {
        const kept = new URLSearchParams(params)
        kept.delete("picker.page")
        return kept
      },
      { replace: true },
    )
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[90vh] grid-rows-[auto_auto_minmax(0,1fr)] sm:max-w-7xl">
        <DialogHeader>
          <DialogTitle>Add products</DialogTitle>
        </DialogHeader>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput placeholder="Search products…" />
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
            <Button
              type="button"
              size="sm"
              variant={categoryId === "" ? "default" : "outline"}
              onClick={() => selectCategory("")}
            >
              All products
            </Button>
            {activeCategories.map((category) => (
              <Button
                key={category.id}
                type="button"
                size="sm"
                variant={categoryId === category.id ? "default" : "outline"}
                onClick={() => selectCategory(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>
        <div className="min-h-0 overflow-auto">
          <DataGrid
            columns={columns}
            query={{ data: products.data && shown, isPending: products.isPending, error: products.error }}
            label="products"
            getRowId={(product) => product.id}
            urlKey="picker"
            defaultPageSize={25}
            rowActions={(product) =>
              addedIds.includes(product.id) ? (
                <Button type="button" size="sm" variant="ghost" disabled>
                  <CheckIcon />
                  Added
                </Button>
              ) : (
                <Button type="button" size="sm" onClick={() => onAdd(product)}>
                  <PlusIcon />
                  Add
                </Button>
              )
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
