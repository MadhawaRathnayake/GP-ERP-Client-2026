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

import { useCreateProduct } from "./api"
import type { NewProduct, Product } from "./types"

const statuses = ["active", "inactive"] as const satisfies readonly Product["status"][]

// Number inputs are kept as text in the form and converted on submit.
const amount = z
  .string()
  .trim()
  .min(1, "Required")
  .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, "Enter an amount of 0 or more")
const count = z
  .string()
  .trim()
  .min(1, "Required")
  .regex(/^\d+$/, "Enter a whole number of 0 or more")

const schema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(64, "Use at most 64 characters"),
  name: z.string().trim().min(1, "Name is required").max(200, "Use at most 200 characters"),
  status: z.enum(statuses),
  price: amount,
  cost: amount,
  stock: count,
  stockInTransit: count,
  stockSold: count,
})

type ProductValues = z.infer<typeof schema>

const numberFields = [
  { name: "price", label: "Price" },
  { name: "cost", label: "Cost" },
  { name: "stock", label: "Stock" },
  { name: "stockInTransit", label: "In transit" },
  { name: "stockSold", label: "Sold" },
] as const

interface ProductFormProps {
  title: string
  submitLabel: string
  pending: boolean
  // Edit passes the saved product; create starts empty.
  product?: Product
  onSubmit: (product: NewProduct) => void
}

// Shared by the create and edit pages.
export function ProductForm({ title, submitLabel, pending, product, onSubmit }: ProductFormProps) {
  const form = useForm<ProductValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sku: product?.sku ?? "",
      name: product?.name ?? "",
      status: product?.status ?? "active",
      price: product ? String(product.price) : "",
      cost: product ? String(product.cost) : "",
      stock: String(product?.stock ?? 0),
      stockInTransit: String(product?.stockInTransit ?? 0),
      stockSold: String(product?.stockSold ?? 0),
    },
  })

  const submit = (values: ProductValues) => {
    onSubmit({
      sku: values.sku,
      name: values.name,
      status: values.status,
      price: Number(values.price),
      cost: Number(values.cost),
      stock: Number(values.stock),
      stockInTransit: Number(values.stockInTransit),
      stockSold: Number(values.stockSold),
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <Card className="max-w-2xl">
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Product name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full capitalize">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status} value={status} className="capitalize">
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {numberFields.map(({ name, label }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
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
