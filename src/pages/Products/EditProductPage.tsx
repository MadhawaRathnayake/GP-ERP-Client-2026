import { useNavigate, useParams } from "react-router-dom"

import { QueryError } from "@/components/StatusView"
import { TopBarActions } from "@/components/TopBarActions"
import { BackButton } from "@/components/TopBarButton"

import { useProduct, useUpdateProduct } from "./api"
import { ProductForm } from "./CreateProductPage"

export function EditProductPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const product = useProduct(id)
  const updateProduct = useUpdateProduct()

  return (
    <div className="space-y-4">
      <TopBarActions>
        <BackButton to={`/products/${id}`} label="Product" />
      </TopBarActions>
      {product.isPending ? (
        <p className="text-sm text-muted-foreground">Loading product…</p>
      ) : product.isError ? (
        <QueryError error={product.error} />
      ) : (
        <ProductForm
          title={`Edit ${product.data.sku}`}
          submitLabel="Save changes"
          pending={updateProduct.isPending}
          product={product.data}
          onSubmit={(changes) =>
            updateProduct.mutate({ id, ...changes }, { onSuccess: () => navigate(`/products/${id}`) })
          }
        />
      )}
    </div>
  )
}
