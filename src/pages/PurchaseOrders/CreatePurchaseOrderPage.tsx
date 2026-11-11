import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeftIcon, PlusIcon, Trash2Icon, TruckIcon } from "lucide-react"
import { useMemo, type ReactNode } from "react"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { z } from "zod"

import { useCan } from "@/app/auth"
import { useFormat, useSettings } from "@/app/settings"
import { NoAccessPage, QueryError } from "@/components/StatusView"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useInternalRequisition } from "@/pages/InternalRequisitions/api"
import type { InternalRequisition } from "@/pages/InternalRequisitions/types"
import { useProducts } from "@/pages/Products/api"
import { lineAmounts, optionalAmount } from "@/pages/Quotations/lines"
import { ProductThumbnail } from "@/pages/Quotations/ProductPickerDialog"
import { useSuppliers } from "@/pages/Suppliers/api"

import { useCreatePurchaseOrder } from "./api"
import type { PurchaseOrder, PurchaseOrderFields } from "./types"

// The preview sums of lines.ts, with the unit price typed on the line.
const amountsOf = (line: Pick<LineValues, "quantity" | "unitPrice" | "discount" | "discountType">, vatRate: number) =>
  lineAmounts({ ...line, price: Number(line.unitPrice) || 0, specialPrice: "" }, vatRate)

const schema = z.object({
  supplierId: z.string().min(1, "Choose a supplier"),
  purchaseOrderDate: z.string().min(1, "Choose the date"),
  comments: z.string().trim().max(2000),
  remarks: z.string().trim().max(2000),
  lines: z
    .array(
      z
        .object({
          productId: z.string(),
          sku: z.string(),
          title: z.string(),
          // Number fields are typed as text and converted on submit.
          quantity: z.string().regex(/^[1-9]\d{0,5}$/, "Whole number, 1 or more"),
          unitPrice: optionalAmount.refine((value) => Number(value) > 0, "Enter the price"),
          discount: optionalAmount,
          discountType: z.enum(["percentage", "fixed"]),
        })
        .superRefine((line, ctx) => {
          if (line.discountType === "percentage" && Number(line.discount) > 100) {
            ctx.addIssue({ code: "custom", path: ["discount"], message: "Up to 100%" })
          } else if (line.discountType === "fixed") {
            const { subtotal, discount } = amountsOf(line, 0)
            if (discount > subtotal) ctx.addIssue({ code: "custom", path: ["discount"], message: "More than the line" })
          }
        }),
    )
    .min(1, "Keep at least one product")
    .max(200, "Up to 200 products"),
})

type PurchaseOrderValues = z.infer<typeof schema>
type LineValues = PurchaseOrderValues["lines"][number]

interface PurchaseOrderFormProps {
  title: string
  submitLabel: string
  pending: boolean
  // Its lines are where a new PO starts, and removed ones can be added back. Edit passes it when the user may view IRs.
  requisition?: InternalRequisition
  // Edit passes the saved PO; create starts from the IR.
  order?: PurchaseOrder
  // Shown above the submit button, e.g. that saving approves the IR.
  note?: ReactNode
  onSubmit: (fields: PurchaseOrderFields) => void
}

export function CreatePurchaseOrderPage() {
  const can = useCan()
  const [searchParams] = useSearchParams()
  const requisitionId = searchParams.get("internalRequisitionId")

  return (
    <div className="space-y-4">
      <TopBarActions>
        <Button variant="ghost" size="sm" asChild>
          <Link to={requisitionId ? `/internal-requisitions/${requisitionId}` : "/purchase-orders"}>
            <ArrowLeftIcon />
            {requisitionId ? "Back to internal requisition" : "Back to purchase orders"}
          </Link>
        </Button>
      </TopBarActions>
      {!requisitionId ? (
        <p className="text-sm text-muted-foreground">
          A purchase order is made from a local internal requisition: open it and choose "Approve & create purchase order".
        </p>
      ) : can("INTERNAL_REQUISITIONS.VIEW") ? (
        <CreateFromRequisition requisitionId={requisitionId} />
      ) : (
        <NoAccessPage />
      )}
    </div>
  )
}

function CreateFromRequisition({ requisitionId }: { requisitionId: string }) {
  const can = useCan()
  const navigate = useNavigate()
  const requisition = useInternalRequisition(requisitionId)
  const createOrder = useCreatePurchaseOrder()

  if (requisition.isPending) return <p className="text-sm text-muted-foreground">Loading internal requisition…</p>
  if (requisition.isError) return <QueryError error={requisition.error} />
  const { status, isInternational, purchaseOrder, internalRequisitionNumber: number } = requisition.data
  // The server refuses the others too; say why instead of showing a form that can't be saved.
  const problem = isInternational
    ? `${number} is international, so it has no purchase order: its printed IR is the document.`
    : purchaseOrder
      ? `${number} already has purchase order ${purchaseOrder.purchaseOrderNumber}.`
      : status !== "pending" && status !== "approved"
        ? `Only a pending or approved internal requisition can be ordered; ${number} isn't.`
        : status === "pending" && !can("INTERNAL_REQUISITIONS.APPROVE")
          ? `${number} is waiting for approval, and saving its purchase order approves it, which you don't have permission to do.`
          : null
  if (problem) return <p className="text-sm text-muted-foreground">{problem}</p>

  const approves = status === "pending"
  return (
    <PurchaseOrderForm
      title={`Create purchase order for ${number}`}
      submitLabel={approves ? "Approve IR & create purchase order" : "Create purchase order"}
      note={approves && `Saving approves ${number} and creates its purchase order. Nothing is saved before that.`}
      pending={createOrder.isPending}
      requisition={requisition.data}
      onSubmit={(fields) =>
        createOrder.mutate(
          { internalRequisitionId: requisition.data.id, ...fields },
          { onSuccess: (created) => navigate(`/purchase-orders/${created.id}`) },
        )
      }
    />
  )
}

// Shared by the create and edit pages. The lines are the IR's products: change the quantity, price and discount, or
// remove some; other products can't be added. "Created by" isn't asked: it's who saves it.
export function PurchaseOrderForm({ title, submitLabel, pending, requisition, order, note, onSubmit }: PurchaseOrderFormProps) {
  const format = useFormat()
  const { data: settings } = useSettings()
  const suppliers = useSuppliers()
  const products = useProducts()
  const vatRate = settings?.vatRate ?? 0

  const requisitionLine = (item: InternalRequisition["items"][number]): LineValues => ({
    productId: item.productId,
    sku: item.product.sku,
    title: item.product.title,
    quantity: String(item.quantity),
    unitPrice: "",
    discount: "",
    discountType: "percentage",
  })

  const form = useForm<PurchaseOrderValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplierId: order?.supplierId ?? requisition?.supplierId ?? "",
      // A new PO is dated today (company timezone, YYYY-MM-DD) unless changed.
      purchaseOrderDate: order?.purchaseOrderDate ?? new Date().toLocaleDateString("en-CA", { timeZone: settings?.timezone }),
      comments: order?.comments ?? "",
      remarks: order?.remarks ?? "",
      lines: order
        ? order.items.map((item) => ({
            productId: item.productId,
            sku: item.product.sku,
            title: item.product.title,
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice),
            discount: item.discountType === "none" ? "" : String(item.discountValue),
            discountType: item.discountType === "fixed" ? "fixed" : "percentage",
          }))
        : (requisition?.items.map(requisitionLine) ?? []),
    },
  })
  const lines = useFieldArray({ control: form.control, name: "lines" })
  const lineValues = useWatch({ control: form.control, name: "lines" })

  // A saved PO keeps its supplier even after it's deleted, so offer it too.
  const savedSupplier = order?.supplier ?? requisition?.supplier
  const supplierOptions = [
    ...(suppliers.data ?? []).filter((supplier) => !supplier.isDeleted),
    ...(savedSupplier && !suppliers.data?.some((supplier) => supplier.id === savedSupplier.id && !supplier.isDeleted) ? [savedSupplier] : []),
  ]
  const productsById = useMemo(() => new Map(products.data?.map((product) => [product.id, product])), [products.data])
  const imageOf = (productId: string) =>
    productsById.get(productId)?.imageUrl ??
    (order?.items.find((item) => item.productId === productId) ?? requisition?.items.find((item) => item.productId === productId))
      ?.product.imageUrl ??
    null
  const removed = (requisition?.items ?? []).filter((item) => !lineValues.some((line) => line.productId === item.productId))

  const amounts = lineValues.map((line) => amountsOf(line, vatRate))
  const sum = (pick: (line: (typeof amounts)[number]) => number) => amounts.reduce((total, line) => total + pick(line), 0)
  const totals: [string, number][] = [
    ["Subtotal", sum((line) => line.subtotal)],
    ["Discount", -sum((line) => line.discount)],
    [`VAT (${vatRate}%)`, sum((line) => line.tax)],
  ]
  const linesError = form.formState.errors.lines?.message ?? form.formState.errors.lines?.root?.message
  const hasErrors = Object.keys(form.formState.errors).length > 0

  const submit = (values: PurchaseOrderValues) =>
    onSubmit({
      supplierId: values.supplierId,
      purchaseOrderDate: values.purchaseOrderDate,
      comments: values.comments || null,
      remarks: values.remarks || null,
      items: values.lines.map((line) => {
        const discountValue = Number(line.discount) || 0
        return {
          productId: line.productId,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
          discountType: discountValue === 0 ? "none" : line.discountType,
          discountValue,
        }
      }),
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
              name="purchaseOrderDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comments or special instructions (printed)</FormLabel>
                  <FormControl>
                    <Input maxLength={2000} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks (internal, not printed)</FormLabel>
                  <FormControl>
                    <Input maxLength={2000} {...field} />
                  </FormControl>
                  <FormMessage />
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
            {lines.fields.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead className="text-right">In hand</TableHead>
                    {requisition && <TableHead className="text-right">IR qty</TableHead>}
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit price</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.fields.map((line, index) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium">{line.sku}</TableCell>
                      <TableCell className="max-w-64 whitespace-normal">{line.title}</TableCell>
                      <TableCell>
                        <ProductThumbnail src={imageOf(line.productId)} alt={line.title} />
                      </TableCell>
                      <TableCell className="text-right">{productsById.get(line.productId)?.stockInHand ?? "—"}</TableCell>
                      {requisition && (
                        <TableCell className="text-right text-muted-foreground">
                          {requisition.items.find((item) => item.productId === line.productId)?.quantity ?? "—"}
                        </TableCell>
                      )}
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`lines.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input className="w-20" inputMode="numeric" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`lines.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input className="w-28" inputMode="decimal" placeholder="0.00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <FormField
                            control={form.control}
                            name={`lines.${index}.discount`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input className="w-24" inputMode="decimal" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`lines.${index}.discountType`}
                            render={({ field }) => (
                              <FormItem>
                                <Select
                                  value={field.value}
                                  onValueChange={(value) => {
                                    field.onChange(value)
                                    void form.trigger(`lines.${index}.discount`)
                                  }}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="percentage">%</SelectItem>
                                    <SelectItem value="fixed">Amount</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{amounts[index] && format.money(amounts[index].total)}</TableCell>
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
                  ))}
                </TableBody>
              </Table>
            )}
            {linesError && (
              <p role="alert" className="text-sm text-destructive">
                {linesError}
              </p>
            )}
            {removed.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Removed from the IR's products:</span>
                {removed.map((item) => (
                  <Button key={item.productId} type="button" variant="outline" size="sm" onClick={() => lines.append(requisitionLine(item))}>
                    <PlusIcon />
                    {item.product.sku}
                  </Button>
                ))}
              </div>
            )}
            <dl className="ml-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-right text-sm">
              {totals.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd>{format.money(value)}</dd>
                </div>
              ))}
              <dt className="border-t pt-2 text-base font-semibold">Total</dt>
              <dd className="border-t pt-2 text-base font-semibold">{format.money(sum((line) => line.total))}</dd>
            </dl>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {hasErrors ? (
            <p className="text-sm text-destructive">Fill in the fields marked in red above.</p>
          ) : (
            note && <p className="text-sm text-muted-foreground">{note}</p>
          )}
          <Button type="submit" disabled={pending || (order !== undefined && !form.formState.isDirty)}>
            {pending ? "Saving…" : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
