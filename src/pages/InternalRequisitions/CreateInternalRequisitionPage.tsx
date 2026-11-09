import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeftIcon, PlusIcon, Trash2Icon, TruckIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useProducts } from "@/pages/Products/api"
import type { Product } from "@/pages/Products/types"
import { ProductPickerDialog, ProductThumbnail } from "@/pages/Quotations/ProductPickerDialog"
import { useSuppliers } from "@/pages/Suppliers/api"

import { useCreateInternalRequisition } from "./api"
import type { InternalRequisition, NewInternalRequisition } from "./types"

const schema = z.object({
  supplierId: z.string().min(1, "Choose a supplier"),
  isInternational: z.boolean(),
  // "" = not set.
  eta: z.string(),
  lines: z
    .array(
      z.object({
        productId: z.string(),
        sku: z.string(),
        title: z.string(),
        quantity: z.string().regex(/^[1-9]\d{0,5}$/, "Whole number, 1 or more"),
      }),
    )
    .min(1, "Add at least one product")
    .max(200, "Up to 200 products"),
})

type InternalRequisitionValues = z.infer<typeof schema>

interface InternalRequisitionFormProps {
  title: string
  submitLabel: string
  pending: boolean
  // Edit passes the saved IR; create starts empty.
  requisition?: InternalRequisition
  onSubmit: (requisition: NewInternalRequisition) => void
}

export function CreateInternalRequisitionPage() {
  const navigate = useNavigate()
  const createRequisition = useCreateInternalRequisition()

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/internal-requisitions">
          <ArrowLeftIcon />
          Back to internal requisitions
        </Link>
      </Button>
      <InternalRequisitionForm
        title="Create internal requisition"
        submitLabel="Create"
        pending={createRequisition.isPending}
        onSubmit={(requisition) =>
          createRequisition.mutate(requisition, { onSuccess: (created) => navigate(`/internal-requisitions/${created.id}`) })
        }
      />
    </div>
  )
}

// Shared by the create and edit pages. The date and "prepared by" aren't asked: they're when and by whom it's created.
export function InternalRequisitionForm({ title, submitLabel, pending, requisition, onSubmit }: InternalRequisitionFormProps) {
  const suppliers = useSuppliers()
  const products = useProducts()
  const [pickerOpen, setPickerOpen] = useState(false)

  const form = useForm<InternalRequisitionValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplierId: requisition?.supplierId ?? "",
      isInternational: requisition?.isInternational ?? false,
      eta: requisition?.eta ?? "",
      lines:
        requisition?.items.map((item) => ({
          productId: item.productId,
          sku: item.product.sku,
          title: item.product.title,
          quantity: String(item.quantity),
        })) ?? [],
    },
  })
  const lines = useFieldArray({ control: form.control, name: "lines" })
  const lineValues = useWatch({ control: form.control, name: "lines" })

  // A saved IR keeps its supplier even after it's deleted, so offer it too.
  const supplierOptions = [
    ...(suppliers.data ?? []).filter((supplier) => !supplier.isDeleted),
    ...(requisition && !suppliers.data?.some((supplier) => supplier.id === requisition.supplierId && !supplier.isDeleted)
      ? [requisition.supplier]
      : []),
  ]
  // Each line shows the product's stock as it is now; the server keeps the figures from when the IR is saved. A saved
  // line's product may have left the list, so its image and figures fall back to what the IR returned.
  const productsById = useMemo(() => new Map(products.data?.map((product) => [product.id, product])), [products.data])
  const lineProduct = (productId: string) => {
    const product = productsById.get(productId)
    const saved = requisition?.items.find((item) => item.productId === productId)
    return {
      imageUrl: product?.imageUrl ?? saved?.product.imageUrl ?? null,
      stockInHand: product?.stockInHand ?? saved?.stockInHand,
      minimumStock: product?.minimumStock ?? saved?.minimumStock,
    }
  }
  const linesError = form.formState.errors.lines?.message ?? form.formState.errors.lines?.root?.message

  // A product appears once; change its quantity instead of adding it again.
  const addProduct = (product: Product) => {
    if (lineValues.some((line) => line.productId === product.id)) return
    lines.append({ productId: product.id, sku: product.sku, title: product.title, quantity: "1" })
  }

  const submit = (values: InternalRequisitionValues) =>
    onSubmit({
      supplierId: values.supplierId,
      isInternational: values.isInternational,
      eta: values.eta || null,
      items: values.lines.map((line) => ({ productId: line.productId, quantity: Number(line.quantity) })),
    })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <TruckIcon className="size-4 text-primary" />
                    Supplier
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={suppliers.isPending}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={suppliers.isPending ? "Loading suppliers…" : "Choose a supplier"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {supplierOptions.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.code} - {supplier.name}
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
              name="eta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ETA (expected arrival)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isInternational"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 sm:col-start-1">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                  </FormControl>
                  <FormLabel>International (no purchase order: the GRN is made from the IR)</FormLabel>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lines.fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">No products added yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead className="text-right">Stock in hand</TableHead>
                    <TableHead className="text-right">Minimum stock</TableHead>
                    <TableHead>Order qty</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.fields.map((line, index) => {
                    const product = lineProduct(line.productId)
                    return (
                      <TableRow key={line.id}>
                        <TableCell className="font-medium">{line.sku}</TableCell>
                        <TableCell className="max-w-64 whitespace-normal">{line.title}</TableCell>
                        <TableCell>
                          <ProductThumbnail src={product.imageUrl} alt={line.title} />
                        </TableCell>
                        <TableCell className="text-right">{product.stockInHand ?? "—"}</TableCell>
                        <TableCell className="text-right">{product.minimumStock ?? "—"}</TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`lines.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input className="w-24" inputMode="numeric" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            aria-label={`Remove ${line.sku}`}
                            onClick={() => lines.remove(index)}
                          >
                            <Trash2Icon />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
            {linesError && <p className="text-sm text-destructive">{linesError}</p>}
            <Button type="button" className="w-full" onClick={() => setPickerOpen(true)}>
              <PlusIcon />
              Add products
            </Button>
            <ProductPickerDialog
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              addedIds={lineValues.map((line) => line.productId)}
              onAdd={addProduct}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending || (requisition !== undefined && !form.formState.isDirty)}>
            {pending ? "Saving…" : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
