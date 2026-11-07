import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeftIcon, MailIcon, MapPinIcon, PhoneIcon, PlusIcon, Trash2Icon, TriangleAlertIcon, UserIcon } from "lucide-react"
import { useMemo, useState, type BaseSyntheticEvent, type ReactNode } from "react"
import { useFieldArray, useForm, useWatch, type UseFormReturn } from "react-hook-form"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { z } from "zod"

import { useCan, useMe } from "@/app/auth"
import { useFormat, useSettings } from "@/app/settings"
import { NoAccessPage, QueryError } from "@/components/StatusView"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCustomers } from "@/pages/Customers/api"
import { useProducts } from "@/pages/Products/api"
import type { Product } from "@/pages/Products/types"
import { useQuotation } from "@/pages/Quotations/api"
import { CustomerDetail, ReferenceSelect, TableLineProduct, type LineProduct } from "@/pages/Quotations/CreateQuotationPage"
import { lineAmounts, lineSchema, optionalAmount, referenceOptions } from "@/pages/Quotations/lines"
import { ProductPickerDialog } from "@/pages/Quotations/ProductPickerDialog"
import {
  fieldsOfType,
  paymentTermsLabels,
  typeFieldLabels,
  typeLabels,
  type Quotation,
  type QuotationItem,
  type SalesManager,
  type TypeField,
} from "@/pages/Quotations/types"

import { useCreateDirectInvoice, useCreateInvoice, useInvoiceSalesManagers } from "./api"
import {
  paymentDetailsLabels,
  paymentMethodLabels,
  type Invoice,
  type InvoiceFields,
  type NewDirectInvoice,
  type QuotationLine,
} from "./types"

const schema = z
  .object({
    // The header: copied from the quotation (shown, not edited) unless the invoice is made without one.
    customerId: z.string().min(1, "Choose a customer"),
    salesManagerId: z.string().min(1, "Choose a sales manager"),
    type: z.enum(["sales", "service", "warranty"]),
    repairReceiveNoteId: z.string(),
    troubleshootId: z.string(),
    oldInvoiceId: z.string(),
    oldSerialNumberId: z.string(),
    productModel: z.string().trim().max(200),
    paymentTerms: z.enum(["", "cashOnDelivery", "advancePayment"]),
    deliveryLocation: z.string().trim().max(500),
    // What the invoice itself asks for. "" = not set.
    paymentMethod: z.enum(["", "cash", "credit", "cheque", "bankTransfer"]),
    paymentDetails: z.string().trim().max(200),
    dueDate: z.string().min(1, "Choose the due date"),
    notes: z.string().trim().max(2000),
    serviceCharge: optionalAmount,
    lines: z.array(lineSchema).max(200, "Up to 200 products"),
  })
  .refine((values) => values.type === "warranty" || values.paymentMethod !== "", {
    path: ["paymentMethod"],
    message: "Choose the payment method",
  })
  .refine((values) => values.type !== "service" || values.serviceCharge !== "", {
    path: ["serviceCharge"],
    message: "Enter the service charge",
  })
  .refine((values) => values.type === "service" || values.lines.length > 0, {
    path: ["lines"],
    message: "Add at least one product",
  })

type InvoiceValues = z.infer<typeof schema>

// The header fields a quotation and an invoice share, shown read-only on the form.
type Header = Pick<
  Quotation,
  | "customerId"
  | "salesManagerId"
  | "salesManager"
  | "type"
  | "repairReceiveNoteId"
  | "troubleshootId"
  | "oldInvoiceId"
  | "oldSerialNumberId"
  | "productModel"
  | "paymentTerms"
  | "deliveryLocation"
  | "serviceCharge"
> & { customer: Pick<Quotation["customer"], "code" | "name" | "houseNumber" | "street" | "city" | "district" | "phones" | "email"> }

// Where the form starts from: a confirmed quotation (create), a saved draft (edit), or nothing (create without a
// quotation, with INVOICES.CREATE_DIRECT, where the header is chosen on the form).
export type InvoiceSource =
  | { kind: "quotation"; quotation: Quotation }
  | { kind: "invoice"; invoice: Invoice }
  | { kind: "direct"; salesManagers: SalesManager[] }

type DirectHeader = Omit<NewDirectInvoice, keyof InvoiceFields>

interface InvoiceFormProps {
  title: string
  submitLabel: string
  pending: boolean
  source: InvoiceSource
  // header is set only for an invoice made without a quotation.
  onSubmit: (fields: InvoiceFields, header: DirectHeader | null) => void
}

export function CreateInvoicePage() {
  const can = useCan()
  const [searchParams] = useSearchParams()
  const quotationId = searchParams.get("quotationId")

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to={quotationId ? `/quotations/${quotationId}` : "/invoices"}>
          <ArrowLeftIcon />
          {quotationId ? "Back to quotation" : "Back to invoices"}
        </Link>
      </Button>
      {quotationId ? (
        can("INVOICES.CREATE") ? <CreateFromQuotation quotationId={quotationId} /> : <NoAccessPage />
      ) : can("INVOICES.CREATE_DIRECT") ? (
        <CreateDirect />
      ) : (
        <NoAccessPage />
      )}
    </div>
  )
}

function CreateFromQuotation({ quotationId }: { quotationId: string }) {
  const navigate = useNavigate()
  const quotation = useQuotation(quotationId)
  const createInvoice = useCreateInvoice()

  if (quotation.isPending) return <p className="text-sm text-muted-foreground">Loading quotation…</p>
  if (quotation.isError) return <QueryError error={quotation.error} />
  const { status, isDeleted, quotationNumber } = quotation.data
  // The server refuses the others too; say why instead of showing a form that can't be saved.
  if ((status !== "paymentConfirmed" && status !== "creditConfirmed") || isDeleted) {
    return (
      <p className="text-sm text-muted-foreground">
        {status === "invoiceCreated"
          ? `Quotation ${quotationNumber} already has an invoice.`
          : `Only a payment- or credit-confirmed quotation can be invoiced; ${quotationNumber} isn't.`}
      </p>
    )
  }
  return (
    <InvoiceForm
      title={`Create invoice for quotation ${quotationNumber}`}
      submitLabel="Save as draft"
      pending={createInvoice.isPending}
      source={{ kind: "quotation", quotation: quotation.data }}
      onSubmit={(fields) =>
        createInvoice.mutate(
          { quotationId: quotation.data.id, ...fields },
          { onSuccess: (created) => navigate(`/invoices/${created.id}`) },
        )
      }
    />
  )
}

function CreateDirect() {
  const navigate = useNavigate()
  const salesManagers = useInvoiceSalesManagers(true)
  const createInvoice = useCreateDirectInvoice()

  if (salesManagers.isPending) return <p className="text-sm text-muted-foreground">Loading sales managers…</p>
  if (salesManagers.isError) return <QueryError error={salesManagers.error} />
  if (salesManagers.data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No sales managers are set up yet, so an invoice can't be created. An admin chooses them in Admin → Dropdowns.
      </p>
    )
  }
  return (
    <InvoiceForm
      title="Create invoice"
      submitLabel="Save as draft"
      pending={createInvoice.isPending}
      source={{ kind: "direct", salesManagers: salesManagers.data }}
      onSubmit={(fields, header) =>
        header &&
        createInvoice.mutate({ ...header, ...fields }, { onSuccess: (created) => navigate(`/invoices/${created.id}`) })
      }
    />
  )
}

type SavedLine = Pick<QuotationItem, "productId" | "product" | "description" | "unitPrice" | "quantity" | "discountType" | "discountValue">

// A saved line as a form line: its price is the saved unit price, and no special price.
const toLine = (item: SavedLine) => ({
  productId: item.productId,
  sku: item.product.sku,
  description: item.description,
  price: item.unitPrice,
  quantity: String(item.quantity),
  specialPrice: "",
  discount: item.discountType === "none" ? "" : String(item.discountValue),
  discountType: item.discountType === "fixed" ? ("fixed" as const) : ("percentage" as const),
})

// Shared by the create and edit pages. Only the payment fields, notes and pricing (lines, prices, discounts, service
// charge) can be changed; the header is the quotation's.
export function InvoiceForm({ title, submitLabel, pending, source, onSubmit }: InvoiceFormProps) {
  const format = useFormat()
  const { data: me } = useMe()
  const { data: settings } = useSettings()
  const products = useProducts()
  const [pickerOpen, setPickerOpen] = useState(false)
  const vatRate = settings?.vatRate ?? 0
  const header: Header | null =
    source.kind === "quotation" ? source.quotation : source.kind === "invoice" ? source.invoice : null
  const invoice = source.kind === "invoice" ? source.invoice : undefined
  const savedItems: SavedLine[] = source.kind === "quotation" ? source.quotation.items : (invoice?.items ?? [])
  // The quotation's own figures, shown next to the invoice's prices.
  const quotationLines: QuotationLine[] =
    source.kind === "quotation" ? source.quotation.items : (invoice?.quotation?.items ?? [])

  const form = useForm<InvoiceValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: header?.customerId ?? "",
      // An invoice without a quotation starts with the signed-in user when they're one of the sales managers.
      salesManagerId:
        header?.salesManagerId ??
        (source.kind === "direct" ? source.salesManagers.find((manager) => manager.id === me?.id)?.id : undefined) ??
        "",
      type: header?.type ?? "sales",
      repairReceiveNoteId: header?.repairReceiveNoteId ?? "",
      troubleshootId: header?.troubleshootId ?? "",
      oldInvoiceId: header?.oldInvoiceId ?? "",
      oldSerialNumberId: header?.oldSerialNumberId ?? "",
      productModel: header?.productModel ?? "",
      paymentTerms: header ? (header.paymentTerms ?? "") : "cashOnDelivery",
      deliveryLocation: header?.deliveryLocation ?? "",
      paymentMethod: invoice?.paymentMethod ?? "",
      paymentDetails: invoice?.paymentDetails ?? "",
      // A new invoice is due today (company timezone, YYYY-MM-DD) unless changed.
      dueDate: invoice?.dueDate ?? new Date().toLocaleDateString("en-CA", { timeZone: settings?.timezone }),
      notes: invoice?.notes ?? "",
      serviceCharge: header?.serviceCharge == null ? "" : String(header.serviceCharge),
      lines: savedItems.map(toLine),
    },
  })
  const hasErrors = Object.keys(form.formState.errors).length > 0
  // Selects and the lines table can't take focus, so react-hook-form can't scroll to them: show the first error instead.
  const showFirstError = (_errors: unknown, event?: BaseSyntheticEvent) => {
    const formElement = event?.target as HTMLFormElement | undefined
    requestAnimationFrame(() => {
      const first = formElement?.querySelector<HTMLElement>('[aria-invalid="true"], [data-slot="form-message"], [role="alert"]')
      first?.scrollIntoView({ behavior: "smooth", block: "center" })
      first?.focus({ preventScroll: true })
    })
  }
  const lines = useFieldArray({ control: form.control, name: "lines" })
  const lineValues = useWatch({ control: form.control, name: "lines" })
  const type = useWatch({ control: form.control, name: "type" })
  const paymentMethod = useWatch({ control: form.control, name: "paymentMethod" })
  const detailsLabel = paymentMethod ? paymentDetailsLabels[paymentMethod] : undefined
  const isService = type === "service"
  const serviceCharge = Number(useWatch({ control: form.control, name: "serviceCharge" })) || 0
  const serviceVat = Math.round(serviceCharge * vatRate) / 100

  const productsById = useMemo(() => new Map(products.data?.map((product) => [product.id, product])), [products.data])
  const lineProduct = (productId: string): LineProduct => {
    const product = productsById.get(productId)
    const saved = savedItems.find((item) => item.productId === productId)?.product
    return {
      description: product?.description ?? saved?.description ?? "",
      imageUrl: product?.imageUrl ?? saved?.imageUrl ?? null,
      manufacturer: product?.manufacturer,
      warrantyMonths: product?.warrantyMonths,
      countryOfOrigin: product?.countryOfOrigin,
    }
  }
  const quotationPrice = (productId: string) => quotationLines.find((line) => line.productId === productId)?.unitPrice
  const amounts = lineValues.map((line) => lineAmounts(line, vatRate))
  const sum = (pick: (line: ReturnType<typeof lineAmounts>) => number) => amounts.reduce((total, line) => total + pick(line), 0)
  const totals: [string, number][] = [
    ["Subtotal", sum((line) => line.subtotal)],
    ["Discount", -sum((line) => line.discount)],
    [`VAT (${vatRate}%)`, sum((line) => line.tax)],
  ]
  const linesError = form.formState.errors.lines?.message ?? form.formState.errors.lines?.root?.message

  const addProduct = (product: Product) => {
    if (lineValues.some((line) => line.productId === product.id)) return
    lines.append({
      productId: product.id,
      sku: product.sku,
      description: product.title,
      price: product.price,
      quantity: "1",
      specialPrice: "",
      discount: "",
      discountType: "percentage",
    })
  }

  const submit = (values: InvoiceValues) => {
    const typeFields = fieldsOfType[values.type]
    const typeField = (field: TypeField) => (typeFields.includes(field) && values[field]) || null
    const fields: InvoiceFields = {
      paymentMethod: values.paymentMethod || null,
      paymentDetails: (values.paymentMethod && paymentDetailsLabels[values.paymentMethod] && values.paymentDetails) || null,
      dueDate: values.dueDate,
      notes: values.notes || null,
      serviceCharge: isService ? Number(values.serviceCharge) : null,
      items: (isService ? [] : values.lines).map((line) => {
        const discountValue = Number(line.discount) || 0
        return {
          productId: line.productId,
          description: line.description,
          quantity: Number(line.quantity),
          unitPrice: line.specialPrice === "" ? line.price : Number(line.specialPrice),
          discountType: discountValue === 0 ? "none" : line.discountType,
          discountValue,
        }
      }),
    }
    onSubmit(
      fields,
      source.kind === "direct"
        ? {
            customerId: values.customerId,
            salesManagerId: values.salesManagerId,
            type: values.type,
            repairReceiveNoteId: typeField("repairReceiveNoteId"),
            troubleshootId: typeField("troubleshootId"),
            oldInvoiceId: typeField("oldInvoiceId"),
            oldSerialNumberId: typeField("oldSerialNumberId"),
            productModel: typeField("productModel"),
            paymentTerms: values.paymentTerms || null,
            deliveryLocation: values.deliveryLocation || null,
          }
        : null,
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit, showFirstError)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {header ? (
              <HeaderDetails header={header} />
            ) : (
              source.kind === "direct" && <DirectHeaderFields form={form} salesManagers={source.salesManagers} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment method</FormLabel>
                  {/* Radix Select can't have an empty-value item, so "Not set" is "none" here and "" in the form. */}
                  <Select value={field.value || "none"} onValueChange={(value) => field.onChange(value === "none" ? "" : value)}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Not set</SelectItem>
                      {Object.entries(paymentMethodLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
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
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {detailsLabel && (
              <FormField
                control={form.control}
                name="paymentDetails"
                render={({ field }) => (
                  <FormItem className="sm:col-start-1">
                    <FormLabel>{detailsLabel}</FormLabel>
                    <FormControl>
                      <Input placeholder={paymentMethod === "cheque" ? "e.g. 123456 - ABC Bank" : "Optional"} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional, internal only" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {isService && (
          <Card>
            <CardHeader>
              <CardTitle>Service charge</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="serviceCharge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service charge</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="0.00" {...field} />
                    </FormControl>
                    {header?.serviceCharge != null && (
                      <p className="text-sm text-muted-foreground">Quotation: {format.money(header.serviceCharge)}</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 self-end text-right text-sm">
                <dt className="text-muted-foreground">{`VAT (${vatRate}%)`}</dt>
                <dd>{format.money(serviceVat)}</dd>
                <dt className="border-t pt-2 text-base font-semibold">Total</dt>
                <dd className="border-t pt-2 text-base font-semibold">{format.money(serviceCharge + serviceVat)}</dd>
              </dl>
            </CardContent>
          </Card>
        )}

        {!isService && (
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
                      <TableHead>Product name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead>Manufacturer</TableHead>
                      <TableHead>Warranty</TableHead>
                      <TableHead>Origin</TableHead>
                      <TableHead className="text-right">In hand</TableHead>
                      <TableHead className="text-right">Quotation price</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead>Special price</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.fields.map((line, index) => {
                      const inHand = productsById.get(line.productId)?.stockInHand
                      const quoted = quotationPrice(line.productId)
                      // The server refuses to invoice more than is in hand; warn before saving.
                      const short = inHand !== undefined && Number(lineValues[index]?.quantity) > inHand
                      return (
                        <TableRow key={line.id}>
                          <TableLineProduct sku={line.sku} title={line.description} product={lineProduct(line.productId)} />
                          <TableCell className={short ? "text-right font-medium text-destructive" : "text-right"}>
                            {inHand ?? "—"}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {quoted === undefined ? "—" : format.money(quoted)}
                          </TableCell>
                          <TableCell className="text-right">{format.money(line.price)}</TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`lines.${index}.specialPrice`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input className="w-28" inputMode="decimal" placeholder="—" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
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
                      )
                    })}
                  </TableBody>
                </Table>
              )}
              {linesError && (
                <p role="alert" className="text-sm text-destructive">
                  {linesError}
                </p>
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
        )}

        <div className="flex items-center justify-end gap-3">
          {hasErrors && <p className="text-sm text-destructive">Fill in the fields marked in red above.</p>}
          <Button type="submit" disabled={pending || (invoice !== undefined && !form.formState.isDirty)}>
            {pending ? "Saving…" : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}

// The header as copied from the quotation: shown, not edited.
function HeaderDetails({ header }: { header: Header }) {
  const { customer } = header
  const address = [customer.houseNumber, customer.street, customer.city, customer.district].filter(Boolean).join(", ")
  const rows: [string, ReactNode][] = [
    ["Sales manager", header.salesManager.name],
    ["Type", typeLabels[header.type]],
    ...fieldsOfType[header.type].map((field): [string, ReactNode] => [typeFieldLabels[field], header[field] ?? "—"]),
    ["Payment terms", header.paymentTerms ? paymentTermsLabels[header.paymentTerms] : "—"],
    ["Delivery location", <span className="whitespace-pre-line">{header.deliveryLocation ?? "—"}</span>],
  ]
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            <UserIcon className="size-4 text-primary" />
            Customer
          </p>
          <p>
            {customer.code} - {customer.name}
          </p>
        </div>
        <div className="grid gap-3 rounded-lg bg-muted p-3 sm:grid-cols-3 sm:gap-0 sm:divide-x">
          <CustomerDetail icon={MapPinIcon} label="Address">
            {address || "—"}
          </CustomerDetail>
          <CustomerDetail icon={PhoneIcon} label="Phone">
            {customer.phones.join(", ") || "—"}
          </CustomerDetail>
          <CustomerDetail icon={MailIcon} label="Email">
            {customer.email || "—"}
          </CustomerDetail>
        </div>
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[minmax(8rem,12rem)_1fr]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}

// The header chosen on the form, for an invoice made without a quotation (INVOICES.CREATE_DIRECT).
function DirectHeaderFields({ form, salesManagers }: { form: UseFormReturn<InvoiceValues>; salesManagers: SalesManager[] }) {
  const customers = useCustomers()
  const customerId = useWatch({ control: form.control, name: "customerId" })
  const type = useWatch({ control: form.control, name: "type" })
  const customer = customers.data?.find((item) => item.id === customerId)
  const address = customer
    ? [customer.houseNumber, customer.street, customer.city, customer.district].filter(Boolean).join(", ")
    : ""
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-4 sm:col-span-2 lg:grid-cols-[2fr_3fr]">
        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <UserIcon className="size-4 text-primary" />
                Customer
              </FormLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={customers.isPending}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={customers.isPending ? "Loading customers…" : "Choose a customer"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {customers.data?.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.code} - {item.name}
                      {item.isCommissioned && " (commissioned)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
              {customer?.isCommissioned && (
                <p className="flex items-center gap-1 text-sm font-medium text-destructive">
                  <TriangleAlertIcon className="size-4" />
                  Commissioned customer
                </p>
              )}
            </FormItem>
          )}
        />
        {customer && (
          <div className="grid gap-3 rounded-lg bg-muted p-3 sm:grid-cols-3 sm:gap-0 sm:divide-x">
            <CustomerDetail icon={MapPinIcon} label="Address">
              {address || "—"}
            </CustomerDetail>
            <CustomerDetail icon={PhoneIcon} label="Phone">
              {customer.phones.join(", ") || "—"}
            </CustomerDetail>
            <CustomerDetail icon={MailIcon} label="Email">
              {customer.email || "—"}
            </CustomerDetail>
          </div>
        )}
      </div>
      <FormField
        control={form.control}
        name="salesManagerId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Sales manager</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a sales manager" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {salesManagers.map((manager) => (
                  <SelectItem key={manager.id} value={manager.id}>
                    {manager.name}
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
        name="type"
        render={({ field }) => (
          <FormItem className="sm:col-start-1">
            <FormLabel>Type</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
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
        name="paymentTerms"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Payment terms</FormLabel>
            <Select value={field.value || "none"} onValueChange={(value) => field.onChange(value === "none" ? "" : value)}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                {Object.entries(paymentTermsLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
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
        name="deliveryLocation"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Delivery location</FormLabel>
            <FormControl>
              <Input placeholder="Optional" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {fieldsOfType[type].map((name) => (
        <FormField
          key={name}
          control={form.control}
          name={name}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{typeFieldLabels[name]}</FormLabel>
              {name === "productModel" ? (
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
              ) : (
                <ReferenceSelect
                  label={typeFieldLabels[name]}
                  options={referenceOptions[name]}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
    </div>
  )
}
