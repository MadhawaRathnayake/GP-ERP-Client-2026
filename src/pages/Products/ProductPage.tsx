import { ArrowLeftIcon, ImageIcon, PencilIcon, RotateCcwIcon, Trash2Icon } from "lucide-react"
import type { ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { useCan } from "@/app/auth"
import { useFormat } from "@/app/settings"
import { QueryError } from "@/components/StatusView"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useCategories } from "@/pages/Categories/api"

import { useDeleteProduct, useProduct, useUpdateProduct } from "./api"

const trackingLabels = { quantity: "Quantity (counted only)", serial: "Serial number (every unit)" }

const externalLink = (url: string | null) =>
  url ? (
    <a href={url} target="_blank" rel="noreferrer" className="break-all underline underline-offset-4">
      {url}
    </a>
  ) : (
    "—"
  )

export function ProductPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const can = useCan()
  const format = useFormat()
  const { data: product, isPending, isError, error } = useProduct(id)
  const categories = useCategories()
  const deleteProduct = useDeleteProduct()
  const updateProduct = useUpdateProduct()

  if (isPending || isError) {
    return (
      <div className="space-y-4">
        <BackLink />
        {isPending ? <p className="text-sm text-muted-foreground">Loading product…</p> : <QueryError error={error} />}
      </div>
    )
  }

  const category = categories.data?.find((item) => item.id === product.categoryId)
  const details: [string, ReactNode][] = [
    ["SKU", product.sku],
    ["Title", product.title],
    ["Description", <span className="whitespace-pre-line">{product.description}</span>],
    ["Category", category ? `${category.name}${category.isActive ? "" : " (deleted)"}` : product.categoryId],
    ["Manufacturer", product.manufacturer ?? "—"],
    ["Warranty", formatWarranty(product.warrantyMonths)],
    ["Country of origin", product.countryOfOrigin ?? "—"],
    ["Stock in hand", product.stockInHand],
    ["Pre-ordered quantity", product.stockPreOrder],
    ["Stock on arrival", product.stockOnArrival],
    ["Stock in transit", product.stockInTransit],
    ["Minimum stock", product.minimumStock],
    ["Cost", format.money(product.cost)],
    ["Price", format.money(product.price)],
    ["Tracking", trackingLabels[product.trackingType]],
    ["Slug", product.slug ?? "—"],
    ["Document", externalLink(product.documentUrl)],
    ["Additional info", <span className="whitespace-pre-line">{product.additionalInfo ?? "—"}</span>],
    ["Status", product.isActive ? "Active" : <span className="text-destructive">Deleted</span>],
    ["Product ID", product.id],
    ["Created", format.dateTime(product.createdAt)],
    ["Modified", product.modifiedAt ? format.dateTime(product.modifiedAt) : "—"],
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold uppercase">Product {product.sku}</h1>
      <BackLink />
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.title} className="w-full object-contain" />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed text-muted-foreground">
            <ImageIcon className="size-10" />
          </div>
        )}
        <div className="space-y-4">
          <dl className="border-t">
            {details.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[minmax(8rem,14rem)_1fr] gap-4 border-b px-2 py-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="min-w-0 break-words">{value}</dd>
              </div>
            ))}
          </dl>
          {(can("PRODUCTS.EDIT") || can("PRODUCTS.DELETE")) && (
            <div className="flex flex-wrap gap-2">
              {product.isActive
                ? can("PRODUCTS.DELETE") && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2Icon />
                          Delete
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete {product.sku}?</DialogTitle>
                          <DialogDescription>
                            It is hidden from the products list and keeps its history. You can restore it from this page.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button
                            variant="destructive"
                            disabled={deleteProduct.isPending}
                            onClick={() =>
                              deleteProduct.mutate(product.id, { onSuccess: () => navigate("/products", { replace: true }) })
                            }
                          >
                            {deleteProduct.isPending ? "Deleting…" : "Delete product"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )
                : can("PRODUCTS.EDIT") && (
                    <Button
                      variant="outline"
                      disabled={updateProduct.isPending}
                      onClick={() => updateProduct.mutate({ id: product.id, isActive: true })}
                    >
                      <RotateCcwIcon />
                      Restore
                    </Button>
                  )}
              {can("PRODUCTS.EDIT") && (
                <Button asChild>
                  <Link to={`/products/${product.id}/edit`}>
                    <PencilIcon />
                    Edit
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 120 → "10 years", 18 → "18 months"
function formatWarranty(months: number) {
  if (months === 0) return "None"
  if (months % 12 === 0) return `${months / 12} ${months === 12 ? "year" : "years"}`
  return `${months} ${months === 1 ? "month" : "months"}`
}

function BackLink() {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link to="/products">
        <ArrowLeftIcon />
        Back to products
      </Link>
    </Button>
  )
}
