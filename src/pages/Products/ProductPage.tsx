import { ArrowLeftIcon, PencilIcon, RotateCcwIcon, Trash2Icon } from "lucide-react"
import type { ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { useCan } from "@/app/auth"
import { useFormat } from "@/app/settings"
import { QueryError } from "@/components/StatusView"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
    ["Category", category ? `${category.name}${category.isActive ? "" : " (deleted)"}` : product.categoryId],
    ["Tracking", trackingLabels[product.trackingType]],
    ["Warranty", `${product.warrantyMonths} months`],
    ["Minimum stock", product.minimumStock],
    ["In hand", product.stockInHand],
    ["Pre-order", product.stockPreOrder],
    ["In transit", product.stockInTransit],
    ["On arrival", product.stockOnArrival],
    ["Manufacturer", product.manufacturer ?? "—"],
    ["Country of origin", product.countryOfOrigin ?? "—"],
    ["Slug", product.slug ?? "—"],
    ["Image", externalLink(product.imageUrl)],
    ["Document", externalLink(product.documentUrl)],
    ...Object.entries(product.additionalInfo ?? {}).map(
      ([key, value]): [string, ReactNode] => [key, typeof value === "string" ? value : JSON.stringify(value)],
    ),
    ["Created", format.dateTime(product.createdAt)],
    ["Modified", product.modifiedAt ? format.dateTime(product.modifiedAt) : "—"],
  ]

  return (
    <div className="space-y-4">
      <BackLink />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>
            {product.title}
            {!product.isActive && <span className="ml-2 text-sm font-normal text-destructive">Deleted</span>}
          </CardTitle>
          <CardDescription>
            {product.sku} · {product.id}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm whitespace-pre-line">{product.description}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            {/* Index keys: additionalInfo names may repeat a fixed label. */}
            {details.map(([label, value], index) => (
              <div key={index} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
        {(can("PRODUCTS.EDIT") || can("PRODUCTS.DELETE")) && (
          <CardFooter className="justify-end gap-2">
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
          </CardFooter>
        )}
      </Card>
    </div>
  )
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
