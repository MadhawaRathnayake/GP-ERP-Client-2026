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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCustomers } from "@/pages/Customers/api"
import { useProducts } from "@/pages/Products/api"
import { warrantyLabel, type Product } from "@/pages/Products/types"

import { useCreateQuotation, useSalesManagers } from "./api"
import { ProductPickerDialog, ProductThumbnail } from "./ProductPickerDialog"
import type { NewQuotation, Quotation, SalesManager } from "./types"

const optionalAmount = z.string().regex(/^(\d+(\.\d{1,2})?)?$/, "Enter an amount, e.g. 1250.50")

// Half-up to 2 decimals, like the server.
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

interface LineValues {
  price: number
  quantity: string
  specialPrice: string
  discount: string
  discountType: "percentage" | "fixed"
}

// Preview of the server's sums (GP-ERP-Server quotations.amounts.ts): the discount comes off the line, then VAT is
// added to what's left. The server saves its own figures.
function lineAmounts(line: LineValues, vatRate: number) {
  const unitPrice = line.specialPrice === "" ? line.price : Number(line.specialPrice)
  const subtotal = round(unitPrice * (Number(line.quantity) || 0))
  const value = Number(line.discount) || 0
  const discount = round(line.discountType === "percentage" ? (subtotal * value) / 100 : value)
  const tax = round(((subtotal - discount) * vatRate) / 100)
  return { subtotal, discount, tax, total: subtotal - discount + tax }
}

// Number fields are typed as text and converted on submit. sku is shown, not sent. price is the product's price for a
// new line and the saved price for an existing one; specialPrice replaces it when filled in.
const lineSchema = z
  .object({
    productId: z.string(),
    sku: z.string(),
    description: z.string(),
    price: z.number(),
    quantity: z.string().regex(/^[1-9]\d*$/, "At least 1"),
    specialPrice: optionalAmount,
    discount: optionalAmount,
    discountType: z.enum(["percentage", "fixed"]),
  })
  .superRefine((line, ctx) => {
    if (line.discountType === "percentage" && Number(line.discount) > 100) {
      ctx.addIssue({ code: "custom", path: ["discount"], message: "Up to 100%" })
    } else if (line.discountType === "fixed") {
      const { subtotal, discount } = lineAmounts(line, 0)
      if (discount > subtotal) ctx.addIssue({ code: "custom", path: ["discount"], message: "More than the line" })
    }
  })

const schema = z
  .object({
    customerId: z.string().min(1, "Choose a customer"),
    salesManagerId: z.string().min(1, "Choose a sales manager"),
    quotationDate: z.string().min(1, "Date is required"),
    validUntil: z.string(),
    notes: z.string().trim().max(2000),
    terms: z.string().trim().max(5000),
    lines: z.array(lineSchema).min(1, "Add at least one product").max(200, "Up to 200 products"),
  })
  // Dates are YYYY-MM-DD, so they compare as text.
  .refine((values) => !values.validUntil || values.validUntil >= values.quotationDate, {
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
      <Button variant="ghost" size="sm" asChild>
        <Link to="/quotations">
          <ArrowLeftIcon />
          Back to quotations
        </Link>
      </Button>
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
      // Today in the company's timezone, as YYYY-MM-DD.
      quotationDate: quotation?.quotationDate ?? new Date().toLocaleDateString("en-CA", { timeZone: settings?.timezone }),
      validUntil: quotation?.validUntil ?? "",
      notes: quotation?.notes ?? "",
      terms: quotation?.terms ?? "",
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
    onSubmit({
      customerId: values.customerId,
      salesManagerId: values.salesManagerId,
      quotationDate: values.quotationDate,
      validUntil: values.validUntil || null,
      notes: values.notes || null,
      terms: values.terms || null,
      items: values.lines.map((line) => {
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
              name="quotationDate"
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
              name="validUntil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valid until</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
          <CardFooter className="justify-end">
            <Button type="submit" disabled={pending || (quotation !== undefined && !form.formState.isDirty)}>
              {pending ? "Saving…" : submitLabel}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}

// One labelled detail in the panel next to the customer dropdown.
function CustomerDetail({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
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
interface LineProduct {
  description: string
  imageUrl: string | null
  manufacturer?: string | null
  warrantyMonths?: number
  countryOfOrigin?: string | null
}

// The read-only product cells at the start of a line.
function TableLineProduct({ sku, title, product }: { sku: string; title: string; product: LineProduct }) {
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
