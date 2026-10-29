import { ArrowLeftIcon, PencilIcon, Trash2Icon } from "lucide-react"
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

import { useDeleteProduct, useProduct } from "./api"

export function ProductPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const can = useCan()
  const format = useFormat()
  const { data: product, isPending, isError, error } = useProduct(id)
  const deleteProduct = useDeleteProduct()

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/products">
          <ArrowLeftIcon />
          Back to products
        </Link>
      </Button>
      {isPending ? (
        <p className="text-sm text-muted-foreground">Loading product…</p>
      ) : isError ? (
        <QueryError error={error} />
      ) : (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{product.sku}</CardTitle>
            <CardDescription>{product.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="capitalize">{product.status}</dd>
              <dt className="text-muted-foreground">Price</dt>
              <dd>{format.money(product.price)}</dd>
              <dt className="text-muted-foreground">Cost</dt>
              <dd>{format.money(product.cost)}</dd>
              <dt className="text-muted-foreground">Stock</dt>
              <dd>{product.stock}</dd>
              <dt className="text-muted-foreground">In transit</dt>
              <dd>{product.stockInTransit}</dd>
              <dt className="text-muted-foreground">Sold</dt>
              <dd>{product.stockSold}</dd>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{format.dateTime(product.createdAt)}</dd>
              <dt className="text-muted-foreground">Updated</dt>
              <dd>{format.dateTime(product.updatedAt)}</dd>
            </dl>
          </CardContent>
          {(can("PRODUCTS.EDIT") || can("PRODUCTS.DELETE")) && (
            <CardFooter className="justify-end gap-2">
              {can("PRODUCTS.DELETE") && (
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
                      <DialogDescription>This removes the product. It cannot be undone.</DialogDescription>
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
      )}
    </div>
  )
}
