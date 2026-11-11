import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowLeftIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  TriangleAlertIcon,
  Trash2Icon,
  UserIcon,
  type LucideIcon,
} from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { z } from "zod"

import { useMe } from "@/app/auth"
import { useFormat, useSettings } from "@/app/settings"
import { QueryError } from "@/components/StatusView"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCustomers } from "@/pages/Customers/api"
import { useProducts } from "@/pages/Products/api"
import { warrantyLabel, type Product } from "@/pages/Products/types"

import { useCreateQuotation, useSalesManagers } from "./api"
import { lineAmounts, lineSchema, optionalAmount, referenceOptions, type ReferenceOption } from "./lines"
import { ProductPickerDialog, ProductThumbnail } from "./ProductPickerDialog"
import {
  fieldsOfType,
  paymentTermsLabels,
  typeFieldLabels,
  typeLabels,
  type NewQuotation,
  type Quotation,
  type SalesManager,
  type TypeField,
} from "./types"

const schema = z
  .object({
    customerId: z.string().min(1, "Choose a customer"),
    salesManagerId: z.string().min(1, "Choose a sales manager"),
    quotationDate: z.string().min(1, "Date is required"),
    // Form only: the "Valid until" date is asked for, and saved, only when this is ticked.
    expires: z.boolean(),
    validUntil: z.string(),
    notes: z.string().trim().max(2000),
    terms: z.string().trim().max(5000),
    type: z.enum(["sales", "service", "warranty"]),
    // "" = none. Only the chosen type's fields are sent (fieldsOfType); the others are sent as null.
    repairReceiveNoteId: z.string(),
    troubleshootId: z.string(),
    oldInvoiceId: z.string(),
    oldSerialNumberId: z.string(),
    productModel: z.string().trim().max(200),
    // "" = not set.
    paymentTerms: z.enum(["", "cashOnDelivery", "advancePayment"]),
    deliveryLocation: z.string().trim().max(500),
    // Service only, which has no product lines; the other types have lines and no charge.
    serviceCharge: optionalAmount,
    // Sales only.
    isPreOrdered: z.boolean(),
    lines: z.array(lineSchema).max(200, "Up to 200 products"),
  })
  .refine((values) => values.type !== "service" || values.serviceCharge !== "", {
    path: ["serviceCharge"],
    message: "Enter the service charge",
  })
  .refine((values) => values.type === "service" || values.lines.length > 0, {
    path: ["lines"],
    message: "Add at least one product",
  })
  .refine((values) => !values.expires || values.validUntil !== "", { path: ["validUntil"], message: "Choose the date" })
  // Dates are YYYY-MM-DD, so they compare as text.
  .refine((values) => !values.expires || values.validUntil >= values.quotationDate, {
    path: ["validUntil"],
    message: "Can't be before the date",
  })

type QuotationValues = z.infer<typeof schema>

interface QuotationFormProps {
  title: string
  submitLabel: string
  pending: boolean
  // The users the sales manager dropdown offers.
  salesManagers: SalesManager[]
  // Edit passes the saved quotation; create starts empty.
  quotation?: Quotation
  onSubmit: (quotation: NewQuotation) => void
}

export function CreateQuotationPage() {
  const navigate = useNavigate()
  const createQuotation = useCreateQuotation()
  const salesManagers = useSalesManagers()

  return (
    <div className="space-y-4">
      <TopBarActions>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/quotations">
            <ArrowLeftIcon />
            Back to quotations
          </Link>
        </Button>
      </TopBarActions>
      {salesManagers.isPending ? (
        <p className="text-sm text-muted-foreground">Loading sales managers…</p>
      ) : salesManagers.isError ? (
        <QueryError error={salesManagers.error} />
      ) : salesManagers.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sales managers are set up yet, so a quotation can't be created. An admin chooses them in Admin → Dropdowns.
        </p>
      ) : (
        <QuotationForm
          title="Create quotation"
          submitLabel="Create"
          pending={createQuotation.isPending}
          salesManagers={salesManagers.data}
          onSubmit={(quotation) =>
            createQuotation.mutate(quotation, { onSuccess: (created) => navigate(`/quotations/${created.id}`) })
          }
        />
      )}
    </div>
  )
}

// Shared by the create and edit pages.
export function QuotationForm({ title, submitLabel, pending, salesManagers, quotation, onSubmit }: QuotationFormProps) {
  const format = useFormat()
  const { data: me } = useMe()
  const { data: settings } = useSettings()
  const customers = useCustomers()
  const products = useProducts()
  const [pickerOpen, setPickerOpen] = useState(false)
  const vatRate = settings?.vatRate ?? 0

  const form = useForm<QuotationValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: quotation?.customerId ?? "",
      // A new quotation starts with the signed-in user when they're one of the sales managers.
      salesManagerId: quotation?.salesManagerId ?? salesManagers.find((manager) => manager.id === me?.id)?.id ?? "",
      // Not on the form: a new quotation is dated today in the company's timezone (YYYY-MM-DD), and an edit keeps the
      // saved date. Still a form value, because "Valid until" can't be before it.
      quotationDate: quotation?.quotationDate ?? new Date().toLocaleDateString("en-CA", { timeZone: settings?.timezone }),
      expires: Boolean(quotation?.validUntil),
      validUntil: quotation?.validUntil ?? "",
      notes: quotation?.notes ?? "",
      terms: quotation?.terms ?? "",
      type: quotation?.type ?? "sales",
      repairReceiveNoteId: quotation?.repairReceiveNoteId ?? "",
      troubleshootId: quotation?.troubleshootId ?? "",
      oldInvoiceId: quotation?.oldInvoiceId ?? "",
      oldSerialNumberId: quotation?.oldSerialNumberId ?? "",
      productModel: quotation?.productModel ?? "",
      // A new quotation starts with Cash on Delivery, as in the old system; a saved one keeps what it has.
      paymentTerms: quotation ? (quotation.paymentTerms ?? "") : "cashOnDelivery",
      deliveryLocation: quotation?.deliveryLocation ?? "",
      serviceCharge: quotation?.serviceCharge == null ? "" : String(quotation.serviceCharge),
      isPreOrdered: quotation?.isPreOrdered ?? false,
      lines:
        quotation?.items.map((item) => ({
          productId: item.productId,
          sku: item.product.sku,
          description: item.description,
          price: item.unitPrice,
          quantity: String(item.quantity),
          specialPrice: "",
          discount: item.discountType === "none" ? "" : String(item.discountValue),
          discountType: item.discountType === "fixed" ? "fixed" : "percentage",
        })) ?? [],
    },
  })
  const lines = useFieldArray({ control: form.control, name: "lines" })
  const lineValues = useWatch({ control: form.control, name: "lines" })
  const customerId = useWatch({ control: form.control, name: "customerId" })
  const expires = useWatch({ control: form.control, name: "expires" })
  const type = useWatch({ control: form.control, name: "type" })
  const typeFields = fieldsOfType[type]
  const isService = type === "service"
  const serviceCharge = Number(useWatch({ control: form.control, name: "serviceCharge" })) || 0
  const serviceVat = Math.round(serviceCharge * vatRate) / 100

  // A saved quotation keeps its customer and sales manager even after they leave the lists, so offer them too.
  const customerOptions: { id: string; code: string; name: string; isCommissioned?: boolean }[] = [
    ...(customers.data ?? []),
    ...(quotation && !customers.data?.some((item) => item.id === quotation.customerId) ? [quotation.customer] : []),
  ]
  const managerOptions = [
    ...salesManagers,
    ...(quotation && !salesManagers.some((manager) => manager.id === quotation.salesManagerId) ? [quotation.salesManager] : []),
  ]
  const customer = customers.data?.find((item) => item.id === customerId)
  const address = customer
    ? [customer.houseNumber, customer.street, customer.city, customer.district].filter(Boolean).join(", ")
    : ""
  // Display only: each line shows its product's details. A saved line's product may have left the list, so its
  // description and image fall back to what the quotation returned.
  const productsById = useMemo(() => new Map(products.data?.map((product) => [product.id, product])), [products.data])
  const lineProduct = (productId: string): LineProduct => {
    const product = productsById.get(productId)
    const saved = quotation?.items.find((item) => item.productId === productId)?.product
    return {
      description: product?.description ?? saved?.description ?? "",
      imageUrl: product?.imageUrl ?? saved?.imageUrl ?? null,
      manufacturer: product?.manufacturer,
      warrantyMonths: product?.warrantyMonths,
      countryOfOrigin: product?.countryOfOrigin,
    }
  }
  const amounts = lineValues.map((line) => lineAmounts(line, vatRate))
  const sum = (pick: (line: ReturnType<typeof lineAmounts>) => number) => amounts.reduce((total, line) => total + pick(line), 0)
  const totals: [string, number][] = [
    ["Subtotal", sum((line) => line.subtotal)],
    ["Discount", -sum((line) => line.discount)],
    [`VAT (${vatRate}%)`, sum((line) => line.tax)],
  ]
  const linesError = form.formState.errors.lines?.message ?? form.formState.errors.lines?.root?.message

  // A product appears once; change its quantity instead of adding it again.
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

  // Blank optional fields are saved as null. A blank or zero discount is no discount.
  const submit = (values: QuotationValues) => {
    // The fields of another type are cleared, so changing the type doesn't keep the old type's references.
    const typeField = (field: TypeField) => (typeFields.includes(field) && values[field]) || null
    onSubmit({
      customerId: values.customerId,
      salesManagerId: values.salesManagerId,
      quotationDate: values.quotationDate,
      validUntil: values.expires ? values.validUntil : null,
      notes: values.notes || null,
      terms: values.terms || null,
      type: values.type,
      repairReceiveNoteId: typeField("repairReceiveNoteId"),
      troubleshootId: typeField("troubleshootId"),
      oldInvoiceId: typeField("oldInvoiceId"),
      oldSerialNumberId: typeField("oldSerialNumberId"),
      productModel: typeField("productModel"),
      paymentTerms: values.paymentTerms || null,
      deliveryLocation: values.deliveryLocation || null,
      serviceCharge: isService ? Number(values.serviceCharge) : null,
      isPreOrdered: values.type === "sales" && values.isPreOrdered,
      // A service quotation is priced by its charge, so it has no lines.
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
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
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
                        {customerOptions.map((item) => (
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
                      {managerOptions.map((manager) => (
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
                  {/* Radix Select can't have an empty-value item, so "Not set" is "none" here and "" in the form. */}
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
            {type === "sales" && (
              <FormField
                control={form.control}
                name="isPreOrdered"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 sm:col-start-1">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                    </FormControl>
                    <FormLabel>Pre-order products</FormLabel>
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Terms</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional, shown to the customer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <FormField
              control={form.control}
              name="expires"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                  </FormControl>
                  <FormLabel>Expires</FormLabel>
                </FormItem>
              )}
            />
            {expires && (
              <FormField
                control={form.control}
                name="validUntil"
                render={({ field }) => (
                  <FormItem className="sm:col-start-1">
                    <FormLabel>Valid until</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {typeFields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{typeLabels[type]} details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {typeFields.map((name) => (
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
              {isService && (
                <>
                  <FormField
                    control={form.control}
                    name="serviceCharge"
                    render={({ field }) => (
                      <FormItem className="sm:col-start-1">
                        <FormLabel>Service charge</FormLabel>
                        <FormControl>
                          <Input inputMode="decimal" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 self-end text-right text-sm sm:col-start-2">
                    <dt className="text-muted-foreground">{`VAT (${vatRate}%)`}</dt>
                    <dd>{format.money(serviceVat)}</dd>
                    <dt className="border-t pt-2 text-base font-semibold">Total</dt>
                    <dd className="border-t pt-2 text-base font-semibold">{format.money(serviceCharge + serviceVat)}</dd>
                  </dl>
                </>
              )}
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
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead>Special price</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.fields.map((line, index) => (
                      <TableRow key={line.id}>
                        <TableLineProduct sku={line.sku} title={line.description} product={lineProduct(line.productId)} />
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
                    ))}
                  </TableBody>
                </Table>
              )}
              {linesError && <p className="text-sm text-destructive">{linesError}</p>}
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

        <div className="flex justify-end">
          <Button type="submit" disabled={pending || (quotation !== undefined && !form.formState.isDirty)}>
            {pending ? "Saving…" : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}

// One labelled detail in the panel next to the customer dropdown. Also on the invoice form.
export function CustomerDetail({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-2 sm:px-4 sm:first:pl-1">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs break-words text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}

// What a line shows about its product besides the SKU and title. Unknown details (the product left the list) are
// undefined and show as "—".
export interface LineProduct {
  description: string
  imageUrl: string | null
  manufacturer?: string | null
  warrantyMonths?: number
  countryOfOrigin?: string | null
}

// The read-only product cells at the start of a line. Also on the invoice form.
export function TableLineProduct({ sku, title, product }: { sku: string; title: string; product: LineProduct }) {
  return (
    <>
      <TableCell className="font-medium">{sku}</TableCell>
      <TableCell className="max-w-48 whitespace-normal">{title}</TableCell>
      <TableCell className="max-w-48 whitespace-normal text-muted-foreground">{product.description || "—"}</TableCell>
      <TableCell>
        <ProductThumbnail src={product.imageUrl} alt={title} />
      </TableCell>
      <TableCell className="max-w-40 whitespace-normal">{product.manufacturer || "—"}</TableCell>
      <TableCell>{product.warrantyMonths === undefined ? "—" : warrantyLabel(product.warrantyMonths)}</TableCell>
      <TableCell>{product.countryOfOrigin || "—"}</TableCell>
    </>
  )
}

// A select of records from another module; "" = none. A saved value that's no longer offered is still shown.
export function ReferenceSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: ReferenceOption[]
  value: string
  onChange: (value: string) => void
}) {
  const shown = value && !options.some((option) => option.id === value) ? [...options, { id: value, label: value }] : options
  return (
    <Select value={value} onValueChange={onChange} disabled={shown.length === 0}>
      <FormControl>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={shown.length === 0 ? "Not available yet" : `Choose a ${label.toLowerCase()}`} />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {shown.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
