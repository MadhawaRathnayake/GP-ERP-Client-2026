import { ArrowLeftIcon } from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useProduct } from "@/hooks/useProducts"

export function ProductPage() {
  const { id = "" } = useParams()
  const { data: product, isPending, isError, error } = useProduct(id)

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
        <p className="text-sm text-destructive">{error.message}</p>
      ) : (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{product.sku}</CardTitle>
            <CardDescription>Product #{product.id}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Price</dt>
              <dd>{product.price.toLocaleString()}</dd>
              <dt className="text-muted-foreground">Cost</dt>
              <dd>{product.cost.toLocaleString()}</dd>
              <dt className="text-muted-foreground">Stock</dt>
              <dd>{product.stock}</dd>
              <dt className="text-muted-foreground">In transit</dt>
              <dd>{product.stockInTransit}</dd>
              <dt className="text-muted-foreground">Sold</dt>
              <dd>{product.stockSold}</dd>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
