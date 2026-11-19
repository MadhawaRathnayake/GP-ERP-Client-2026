import { createColumnHelper } from "@tanstack/react-table"
import { CheckIcon, ImageIcon, PlusIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { useFormat } from "@/app/settings"
import type { GridFeatures } from "@/components/DataGrid"
import { PickerDialog } from "@/components/PickerDialog"
import { Button } from "@/components/ui/button"
import { useCategories } from "@/pages/Categories/api"

import { useProducts } from "./api"
import { warrantyLabel, type Product } from "./types"

const columnHelper = createColumnHelper<GridFeatures, Product>()

// The product image, or a placeholder when it has none.
export function ProductThumbnail({ src, alt }: { src: string | null; alt: string }) {
  return src ? (
    <img src={src} alt={alt} loading="lazy" className="size-16 object-contain" />
  ) : (
    <div className="flex size-16 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <ImageIcon className="size-6" />
    </div>
  )
}

interface ProductPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Products already chosen; they show as added (or selected) instead of offering the action again.
  addedIds: string[]
  onAdd: (product: Product) => void
  // "Add products" (several, the dialog stays open) by default; a single choice passes its own wording.
  title?: string
  actionLabel?: string
}

// Choosing products from the cached useProducts() list: search, filter by category, add them one by one.
export function ProductPickerDialog({
  open,
  onOpenChange,
  addedIds,
  onAdd,
  title = "Add products",
  actionLabel = "Add",
}: ProductPickerDialogProps) {
  const format = useFormat()
  const [, setSearchParams] = useSearchParams()
  const products = useProducts()
  const categories = useCategories()
  const [categoryId, setCategoryId] = useState("")

  const activeCategories = (categories.data ?? []).filter((category) => !category.isDeleted)
  const shown = useMemo(
    () => products.data?.filter((product) => !product.isDeleted && (!categoryId || product.categoryId === categoryId)),
    [products.data, categoryId],
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
    <PickerDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      searchPlaceholder="Search products…"
      columns={columns}
      query={{ data: shown, isPending: products.isPending, error: products.error }}
      label="products"
      getRowId={(product) => product.id}
      filters={
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
          <Button type="button" size="sm" variant={categoryId === "" ? "default" : "outline"} onClick={() => selectCategory("")}>
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
      }
      rowAction={(product) =>
        addedIds.includes(product.id) ? (
          <Button type="button" size="sm" variant="ghost" disabled>
            <CheckIcon />
            {actionLabel === "Add" ? "Added" : "Selected"}
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={() => onAdd(product)}>
            {actionLabel === "Add" && <PlusIcon />}
            {actionLabel}
          </Button>
        )
      }
    />
  )
}
