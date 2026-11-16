import { zodResolver } from "@hookform/resolvers/zod"
import { BarcodeIcon, BoxesIcon, ImageIcon, InfoIcon, PackageIcon, SaveIcon, TagIcon, UploadIcon } from "lucide-react"
import { useRef } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { z } from "zod"

import { FormSection, RequiredMark } from "@/components/FormSection"
import { TopBarActions } from "@/components/TopBarActions"
import { BackButton, TopBarButton } from "@/components/TopBarButton"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useCategories } from "@/pages/Categories/api"

import { useCreateProduct, useUploadProductImage } from "./api"
import type { NewProduct, Product } from "./types"

const wholeNumber = z.string().regex(/^\d+$/, "Enter a whole number")
// Optional numbers: an empty box is saved as 0 (Number("") === 0).
const optionalWholeNumber = z.string().regex(/^\d*$/, "Enter a whole number")
const optionalAmount = z.string().regex(/^(\d+(\.\d{1,2})?)?$/, "Enter an amount, e.g. 1250.50")

// Price and cost: the server records every change to them as a movement. Stock isn't on the form: a new product starts
// at 0, and stock changes through GRNs, invoices and "Adjust stock" on the product page.

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
  additionalInfo: z.string().trim().max(5000),
  description: z.string().trim().max(5000),
  manufacturer: z.string().trim().max(200),
  countryOfOrigin: z.string().trim().max(100),
  slug: z.string().trim().max(200),
  imageUrl: z.union([z.literal(""), z.url("Enter a full address, e.g. https://…")]),
  documentUrl: z.union([z.literal(""), z.url("Enter a full address, e.g. https://…")]),
})

type ProductValues = z.infer<typeof schema>

interface TextFieldSpec {
  name: Exclude<keyof ProductValues, "categoryId" | "trackingType" | "imageUrl">
  label: string
  placeholder?: string
  required?: boolean
  // Which keyboard a phone opens.
  keyboard?: "numeric" | "decimal" | "url"
  // Spans the whole row.
  wide?: boolean
}

const trackingTypes = [
  { value: "quantity", label: "Quantity", icon: BoxesIcon },
  { value: "serial", label: "Serial number", icon: BarcodeIcon },
] as const

interface ProductFormProps {
  title: string
  submitLabel: string
  // The top bar's back button.
  back: { to: string; label: string }
  pending: boolean
  // Edit passes the saved product; create starts empty.
  product?: Product
  onSubmit: (product: NewProduct) => void
}

export function CreateProductPage() {
  const navigate = useNavigate()
  const createProduct = useCreateProduct()

  return (
    <ProductForm
      title="New product"
      submitLabel="Create"
      back={{ to: "/products", label: "Products" }}
      pending={createProduct.isPending}
      onSubmit={(product) =>
        createProduct.mutate(product, { onSuccess: (created) => navigate(`/products/${created.id}`) })
      }
    />
  )
}

// Shared by the create and edit pages. Same layout as the customer form.
export function ProductForm({ title, submitLabel, back, pending, product, onSubmit }: ProductFormProps) {
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
      additionalInfo: product?.additionalInfo ?? "",
      description: product?.description ?? "",
      manufacturer: product?.manufacturer ?? "",
      countryOfOrigin: product?.countryOfOrigin ?? "",
      slug: product?.slug ?? "",
      imageUrl: product?.imageUrl ?? "",
      documentUrl: product?.documentUrl ?? "",
    },
  })

  // Blank optional fields are saved as null.
  const submit = (values: ProductValues) => {
    onSubmit({
      ...values,
      warrantyMonths: Number(values.warrantyMonths),
      minimumStock: Number(values.minimumStock),
      price: Number(values.price),
      cost: Number(values.cost),
      additionalInfo: values.additionalInfo || null,
      description: values.description || null,
      manufacturer: values.manufacturer || null,
      countryOfOrigin: values.countryOfOrigin || null,
      slug: values.slug || null,
      imageUrl: values.imageUrl || null,
      documentUrl: values.documentUrl || null,
    })
  }

  const textField = ({ name, label, placeholder, required, keyboard, wide }: TextFieldSpec) => (
    <FormField
      key={name}
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn(wide && "sm:col-span-2 lg:col-span-3")}>
          <FormLabel>
            {label}
            {required && <RequiredMark />}
          </FormLabel>
          <FormControl>
            <Input placeholder={placeholder} inputMode={keyboard} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Form {...form}>
      <TopBarActions>
        <BackButton to={back.to} label={back.label} />
        {/* The top bar is outside the <form>; the `form` attribute ties the button to it. */}
        <TopBarButton
          tone="main"
          type="submit"
          form="product-form"
          icon={SaveIcon}
          label={pending ? "Saving…" : submitLabel}
          disabled={pending || uploadImage.isPending || (product !== undefined && !form.formState.isDirty)}
        />
      </TopBarActions>

      <form id="product-form" onSubmit={form.handleSubmit(submit)} className="mx-auto max-w-6xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <Card className="gap-0 divide-y py-0 shadow-card">
          <FormSection title="Product" description="What it is and where it is listed." icon={PackageIcon} tone="blue">
            {textField({ name: "sku", label: "SKU", placeholder: "GP-1001", required: true })}
            {textField({ name: "title", label: "Title", placeholder: "Product title", required: true })}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Category
                    <RequiredMark />
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* Only active categories, plus the product's current one if it was deleted. */}
                      {categories.data
                        ?.filter((category) => !category.isDeleted || category.id === product?.categoryId)
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
            {textField({ name: "description", label: "Description", placeholder: "Shown on quotations and invoices", wide: true })}
          </FormSection>

          <FormSection
            title="Stock and warranty"
            description="How units are counted, when to reorder, and the cover."
            icon={BoxesIcon}
            tone="teal"
          >
            <FormField
              control={form.control}
              name="trackingType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tracking</FormLabel>
                  {/* Quantity: counted only. Serial number: every unit is scanned in and out. */}
                  <div role="radiogroup" aria-label="Tracking" className="grid h-9 grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                    {trackingTypes.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={field.value === value}
                        onClick={() => field.onChange(value)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                          field.value === value ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Icon className="size-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            {textField({ name: "minimumStock", label: "Minimum stock", placeholder: "0", keyboard: "numeric" })}
            {textField({ name: "warrantyMonths", label: "Warranty (months)", placeholder: "12", required: true, keyboard: "numeric" })}
          </FormSection>

          <FormSection title="Pricing" description="Every change is kept in the product's history." icon={TagIcon} tone="amber">
            {textField({ name: "price", label: "Price", placeholder: "0.00", keyboard: "decimal" })}
            {textField({ name: "cost", label: "Cost", placeholder: "0.00", keyboard: "decimal" })}
          </FormSection>

          <FormSection title="Details" description="Maker, origin and links." icon={InfoIcon} tone="violet">
            {textField({ name: "manufacturer", label: "Manufacturer", placeholder: "Growatt" })}
            {textField({ name: "countryOfOrigin", label: "Country of origin", placeholder: "China" })}
            {textField({ name: "slug", label: "Slug", placeholder: "solar-inverter-5kw" })}
            {textField({ name: "documentUrl", label: "Document URL", placeholder: "https://…", keyboard: "url" })}
            <div className="sm:col-span-2">
              {textField({ name: "additionalInfo", label: "Additional info", placeholder: "Anything else about this product" })}
            </div>
          </FormSection>

          <FormSection title="Image" description="JPEG, PNG or WebP." icon={ImageIcon} tone="rose">
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">Image</FormLabel>
                  {field.value ? (
                    <div className="space-y-2">
                      <img src={field.value} alt="Product" className="h-40 w-full rounded-md border object-contain" />
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
          </FormSection>
        </Card>
      </form>
    </Form>
  )
}
