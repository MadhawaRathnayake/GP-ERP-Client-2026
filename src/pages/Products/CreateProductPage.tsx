import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeftIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCategories } from "@/pages/Categories/api"

import { useCreateProduct } from "./api"
import type { NewProduct, Product } from "./types"

// Number fields are typed as text and converted on submit.
const schema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(64),
  title: z.string().trim().min(1, "Title is required").max(200),
  categoryId: z.string().min(1, "Choose a category"),
  trackingType: z.enum(["quantity", "serial"]),
  warrantyMonths: z.string().regex(/^\d+$/, "Enter a whole number"),
  minimumStock: z.string().regex(/^\d+$/, "Enter a whole number"),
  description: z.string().trim().max(5000),
  manufacturer: z.string().trim().max(200),
  countryOfOrigin: z.string().trim().max(100),
  slug: z.string().trim().max(200),
  imageUrl: z.union([z.literal(""), z.url("Enter a full address, e.g. https://…")]),
  documentUrl: z.union([z.literal(""), z.url("Enter a full address, e.g. https://…")]),
})

type ProductValues = z.infer<typeof schema>

interface ProductFormProps {
  title: string
  submitLabel: string
  pending: boolean
  // Edit passes the saved product; create starts empty.
  product?: Product
  onSubmit: (product: NewProduct) => void
}

export function CreateProductPage() {
  const navigate = useNavigate()
  const createProduct = useCreateProduct()

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/products">
          <ArrowLeftIcon />
          Back to products
        </Link>
      </Button>
      <ProductForm
        title="Create product"
        submitLabel="Create"
        pending={createProduct.isPending}
        onSubmit={(product) =>
          createProduct.mutate(product, { onSuccess: (created) => navigate(`/products/${created.id}`) })
        }
      />
    </div>
  )
}

// Shared by the create and edit pages. Stock levels are not here: the server sets them from stock movements.
export function ProductForm({ title, submitLabel, pending, product, onSubmit }: ProductFormProps) {
  const categories = useCategories()
  const form = useForm<ProductValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sku: product?.sku ?? "",
      title: product?.title ?? "",
      categoryId: product?.categoryId ?? "",
      trackingType: product?.trackingType ?? "quantity",
      warrantyMonths: String(product?.warrantyMonths ?? 0),
      minimumStock: String(product?.minimumStock ?? 0),
      description: product?.description ?? "",
      manufacturer: product?.manufacturer ?? "",
      countryOfOrigin: product?.countryOfOrigin ?? "",
      slug: product?.slug ?? "",
      imageUrl: product?.imageUrl ?? "",
      documentUrl: product?.documentUrl ?? "",
    },
  })

  // Blank optional fields are saved as null. A blank description on create is left out so the server uses "N/A".
  const submit = (values: ProductValues) => {
    onSubmit({
      ...values,
      warrantyMonths: Number(values.warrantyMonths),
      minimumStock: Number(values.minimumStock),
      description: product || values.description ? values.description : undefined,
      manufacturer: values.manufacturer || null,
      countryOfOrigin: values.countryOfOrigin || null,
      slug: values.slug || null,
      imageUrl: values.imageUrl || null,
      documentUrl: values.documentUrl || null,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input placeholder="GP-1001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Product title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* Only active categories, plus the product's current one if it was deleted. */}
                      {categories.data
                        ?.filter((category) => category.isActive || category.id === product?.categoryId)
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="trackingType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tracking</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="quantity">Quantity (counted only)</SelectItem>
                      <SelectItem value="serial">Serial number (every unit)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="manufacturer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manufacturer</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="countryOfOrigin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country of origin</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="warrantyMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Warranty (months)</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minimumStock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum stock</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional, e.g. solar-inverter-5kw" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="documentUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={pending || (product !== undefined && !form.formState.isDirty)}>
              {pending ? "Saving…" : submitLabel}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}