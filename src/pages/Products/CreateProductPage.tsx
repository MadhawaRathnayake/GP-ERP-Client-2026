import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeftIcon, ImageIcon, UploadIcon } from "lucide-react"
import { useRef } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCategories } from "@/pages/Categories/api"

import { useCreateProduct, useUploadProductImage } from "./api"
import type { NewProduct, Product } from "./types"

const wholeNumber = z.string().regex(/^\d+$/, "Enter a whole number")
// Optional numbers: an empty box is saved as 0 (Number("") === 0).
const optionalWholeNumber = z.string().regex(/^\d*$/, "Enter a whole number")
const optionalAmount = z.string().regex(/^(\d+(\.\d{1,2})?)?$/, "Enter an amount, e.g. 1250.50")

// Price, cost and opening stock: the server records every change to them as a movement.
const quantityFields = [
  { name: "price", label: "Price", parse: optionalAmount },
  { name: "cost", label: "Cost", parse: optionalAmount },
  { name: "stockInHand", label: "Stock in hand", parse: optionalWholeNumber },
  { name: "stockPreOrder", label: "Stock pre-ordered", parse: optionalWholeNumber },
  { name: "stockInTransit", label: "Stock in transit", parse: optionalWholeNumber },
  { name: "stockOnArrival", label: "Stock on arrival", parse: optionalWholeNumber },
] as const

// Number fields are typed as text and converted on submit.
const schema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(64),
  title: z.string().trim().min(1, "Title is required").max(200),
  categoryId: z.string().min(1, "Choose a category"),
  trackingType: z.enum(["quantity", "serial"]),
  warrantyMonths: wholeNumber,
  minimumStock: optionalWholeNumber,
  price: optionalAmount,
  cost: optionalAmount,
  stockInHand: optionalWholeNumber,
  stockPreOrder: optionalWholeNumber,
  stockInTransit: optionalWholeNumber,
  stockOnArrival: optionalWholeNumber,
  additionalInfo: z.string().trim().max(5000),
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

// Shared by the create and edit pages.
export function ProductForm({ title, submitLabel, pending, product, onSubmit }: ProductFormProps) {
  const categories = useCategories()
  const uploadImage = useUploadProductImage()
  // The file input is hidden; the "Upload an image" button opens it.
  const imageInput = useRef<HTMLInputElement>(null)
  const form = useForm<ProductValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sku: product?.sku ?? "",
      title: product?.title ?? "",
      categoryId: product?.categoryId ?? "",
      trackingType: product?.trackingType ?? "quantity",
      warrantyMonths: product ? String(product.warrantyMonths) : "",
      minimumStock: product ? String(product.minimumStock) : "",
      price: product ? String(product.price) : "",
      cost: product ? String(product.cost) : "",
      stockInHand: product ? String(product.stockInHand) : "",
      stockPreOrder: product ? String(product.stockPreOrder) : "",
      stockInTransit: product ? String(product.stockInTransit) : "",
      stockOnArrival: product ? String(product.stockOnArrival) : "",
      additionalInfo: product?.additionalInfo ?? "",
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
      price: Number(values.price),
      cost: Number(values.cost),
      stockInHand: Number(values.stockInHand),
      stockPreOrder: Number(values.stockPreOrder),
      stockInTransit: Number(values.stockInTransit),
      stockOnArrival: Number(values.stockOnArrival),
      additionalInfo: values.additionalInfo || null,
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
                  <FormLabel>Image</FormLabel>
                  {field.value ? (
                    <div className="space-y-2">
                      <img src={field.value} alt="Product" className="h-40 w-full rounded-md border object-contain" />
                      <a href={field.value} target="_blank" rel="noreferrer" className="block text-sm break-all underline">
                        {field.value}
                      </a>
                      {/* Only clears the field; the next upload replaces the image when the product is saved. */}
                      <Button type="button" variant="outline" size="sm" onClick={() => field.onChange("")}>
                        Remove image
                      </Button>
                    </div>
                  ) : (
                    <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-md border border-dashed text-muted-foreground">
                      <ImageIcon className="size-8" />
                      <FormControl>
                        <input
                          ref={imageInput}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) uploadImage.mutate(file, { onSuccess: (url) => field.onChange(url) })
                          }}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadImage.isPending}
                        onClick={() => imageInput.current?.click()}
                      >
                        <UploadIcon />
                        {uploadImage.isPending ? "Uploading…" : "Upload an image"}
                      </Button>
                    </div>
                  )}
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
            <FormField
              control={form.control}
              name="warrantyMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Warranty (months)</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" placeholder="0" {...field} />
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
                    <Input inputMode="numeric" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {quantityFields.map(({ name, label, parse }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input inputMode={parse === optionalAmount ? "decimal" : "numeric"} placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <FormField
              control={form.control}
              name="additionalInfo"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Additional info</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="justify-end">
            <Button
              type="submit"
              disabled={pending || uploadImage.isPending || (product !== undefined && !form.formState.isDirty)}
            >
              {pending ? "Saving…" : submitLabel}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}