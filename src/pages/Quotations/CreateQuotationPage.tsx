import { zodResolver } from "@hookform/resolvers/zod"
import {
  ClipboardListIcon,
  FileTextIcon,
  MailIcon,
  MapPinIcon,
  PackageIcon,
  PhoneIcon,
  PlusIcon,
  SaveIcon,
  StickyNoteIcon,
  TriangleAlertIcon,
  Trash2Icon,
  UserIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { z } from "zod"

import { useMe } from "@/app/auth"
import { useFormat, useSettings } from "@/app/settings"
import { FormSection, RequiredMark } from "@/components/FormSection"
import { QueryError } from "@/components/StatusView"
import { TopBarActions } from "@/components/TopBarActions"
import { BackButton, TopBarButton } from "@/components/TopBarButton"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCustomers } from "@/pages/Customers/api"
import { cn } from "@/lib/utils"
import { useProducts } from "@/pages/Products/api"
import { warrantyLabel, type Product } from "@/pages/Products/types"

import { useCreateQuotation, useSalesManagers } from "./api"
import { lineAmounts, lineSchema, optionalAmount, referenceOptions, type ReferenceOption } from "./lines"
import { OldInvoicePicker, OldSerialPicker } from "./ReferenceLinks"
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
    // The links: an id ("" = none), and the number shown (form only; the server copies it).
    oldInvoiceId: z.string(),
    oldInvoiceLabel: z.string(),
    oldSerialItemId: z.string(),
    oldSerialLabel: z.string(),
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
  // The top bar's back button.
  back: { to: string; label: string }
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
      {/* Once the form shows, it puts its own back and save buttons in the top bar. */}
      {!(salesManagers.isSuccess && salesManagers.data.length > 0) && (
        <TopBarActions>
          <BackButton to="/quotations" label="Quotations" />
        </TopBarActions>
      )}
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
          title="New quotation"
          submitLabel="Create"
          back={{ to: "/quotations", label: "Quotations" }}
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

// Shared by the create and edit pages. Same layout as the customer form, with the product lines in their own card.
export function QuotationForm({ title, submitLabel, back, pending, salesManagers, quotation, onSubmit }: QuotationFormProps) {
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
      oldInvoiceId: quotation?.oldInvoiceId ? String(quotation.oldInvoiceId) : "",
      oldInvoiceLabel: quotation?.oldInvoiceNumber ?? "",
      oldSerialItemId: quotation?.oldSerialItemId ? String(quotation.oldSerialItemId) : "",
      oldSerialLabel: quotation?.oldSerialNumber ?? "",
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
  const oldInvoiceLabel = useWatch({ control: form.control, name: "oldInvoiceLabel" })
  const oldSerialLabel = useWatch({ control: form.control, name: "oldSerialLabel" })
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
    const typeField = (field: Exclude<TypeField, "oldInvoiceId" | "oldSerialItemId">) => (typeFields.includes(field) && values[field]) || null
    const link = (field: "oldInvoiceId" | "oldSerialItemId") => (typeFields.includes(field) && values[field] ? Number(values[field]) : null)
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
      oldInvoiceId: link("oldInvoiceId"),
      oldSerialItemId: link("oldSerialItemId"),
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

  const selectField = <Name extends "salesManagerId" | "paymentTerms">(
    name: Name,
    label: string,
    options: { value: string; label: string }[],
    required?: boolean,
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && <RequiredMark />}
          </FormLabel>
          {/* Radix Select can't have an empty-value item, so "Not set" is "none" here and "" in the form. */}
          <Select
            value={required ? field.value : field.value || "none"}
            onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={`Choose a ${label.toLowerCase()}`} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {!required && <SelectItem value="none">Not set</SelectItem>}
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          form="quotation-form"
          icon={SaveIcon}
          label={pending ? "Saving…" : submitLabel}
          disabled={pending || (quotation !== undefined && !form.formState.isDirty)}
        />
      </TopBarActions>

      <form id="quotation-form" onSubmit={form.handleSubmit(submit)} className="mx-auto max-w-6xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <Card className="gap-0 divide-y py-0 shadow-card">
          <FormSection title="Customer" description="Who it's for and who handles it." icon={UserIcon} tone="blue">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>
                    Customer
                    <RequiredMark />
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
                </FormItem>
              )}
            />
            {selectField(
              "salesManagerId",
              "Sales manager",
              managerOptions.map((manager) => ({ value: manager.id, label: manager.name })),
              true,
            )}
            {customer && (
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                {customer.isCommissioned && (
                  <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                    <TriangleAlertIcon className="size-4" />
                    Commissioned customer
                  </p>
                )}
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
            )}
          </FormSection>

          <FormSection title="Quotation" description="Its type, how it's paid and how long it holds." icon={FileTextIcon} tone="teal">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="sm:col-span-2 lg:col-span-1">
                  <FormLabel>Type</FormLabel>
                  <div role="radiogroup" aria-label="Type" className="grid h-9 grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={field.value === value}
                        onClick={() => field.onChange(value)}
                        className={cn(
                          "rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                          field.value === value ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            {selectField(
              "paymentTerms",
              "Payment terms",
              Object.entries(paymentTermsLabels).map(([value, label]) => ({ value, label })),
            )}
            {/* "Expires" only shows the date; unticked saves no expiry. */}
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="expires"
                render={({ field }) => (
                  <FormItem className="flex h-5 items-center gap-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                    </FormControl>
                    <FormLabel>{expires ? "Valid until" : "Expires"}</FormLabel>
                  </FormItem>
                )}
              />
              {expires ? (
                <FormField
                  control={form.control}
                  name="validUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="date" aria-label="Valid until" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <p className="flex h-9 items-center text-sm text-muted-foreground">No expiry</p>
              )}
            </div>
            {type === "sales" && (
              <FormField
                control={form.control}
                name="isPreOrdered"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 sm:col-span-2 lg:col-span-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                    </FormControl>
                    <FormLabel>Pre-order products</FormLabel>
                  </FormItem>
                )}
              />
            )}
          </FormSection>

          {typeFields.length > 0 && (
            <FormSection
              title={`${typeLabels[type]} details`}
              description={isService ? "What is serviced, and the charge: a service quotation has no product lines." : "The unit under warranty."}
              icon={WrenchIcon}
              tone="violet"
            >
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
                          <Input placeholder="Model of the unit" {...field} />
                        </FormControl>
                      ) : name === "oldSerialItemId" ? (
                        <OldSerialPicker
                          value={{ id: field.value, label: oldSerialLabel }}
                          onChange={(choice) => {
                            field.onChange(choice.id)
                            form.setValue("oldSerialLabel", choice.label, { shouldDirty: true })
                          }}
                          // The unit's invoice and model fill those fields.
                          onUnit={(unit) => {
                            if (unit.invoice?.invoiceNumber) {
                              form.setValue("oldInvoiceId", String(unit.invoice.id), { shouldDirty: true })
                              form.setValue("oldInvoiceLabel", unit.invoice.invoiceNumber, { shouldDirty: true })
                            }
                            if (type === "warranty" && !form.getValues("productModel")) {
                              form.setValue("productModel", unit.product.title, { shouldDirty: true })
                            }
                          }}
                        />
                      ) : name === "oldInvoiceId" ? (
                        <OldInvoicePicker
                          value={{ id: field.value, label: oldInvoiceLabel }}
                          onChange={(choice) => {
                            field.onChange(choice.id)
                            form.setValue("oldInvoiceLabel", choice.label, { shouldDirty: true })
                          }}
                        />
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
                        <FormLabel>
                          Service charge
                          <RequiredMark />
                        </FormLabel>
                        <FormControl>
                          <Input inputMode="decimal" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 self-end text-right text-sm lg:col-span-2 lg:ml-auto lg:w-72">
                    <dt className="text-muted-foreground">{`VAT (${vatRate}%)`}</dt>
                    <dd className="tabular-nums">{format.money(serviceVat)}</dd>
                    <dt className="border-t pt-2 text-base font-semibold">Total</dt>
                    <dd className="border-t pt-2 text-base font-semibold tabular-nums">{format.money(serviceCharge + serviceVat)}</dd>
                  </dl>
                </>
              )}
            </FormSection>
          )}

          <FormSection title="Delivery and notes" description="Terms are printed for the customer; notes stay internal." icon={StickyNoteIcon} tone="rose">
            {(
              [
                ["deliveryLocation", "Delivery location", "Site or address"],
                ["terms", "Terms", "Printed on the quotation"],
                ["notes", "Notes", "Only the team sees these"],
              ] as const
            ).map(([name, label, placeholder]) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input placeholder={placeholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </FormSection>
        </Card>

        {!isService && (
          <Card className="gap-0 py-0 shadow-card">
            <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-chart-3/18 text-chart-3">
                <PackageIcon className="size-4" />
              </span>
              <div className="mr-auto">
                <h2 className="font-medium">
                  Products
                  <RequiredMark />
                </h2>
                <p className="text-xs text-muted-foreground">
                  {lines.fields.length === 0 ? "Add at least one." : `${lines.fields.length} added. A special price replaces the price.`}
                </p>
              </div>
              <Button type="button" variant="soft" onClick={() => setPickerOpen(true)}>
                <PlusIcon />
                Add products
              </Button>
            </div>
            {lines.fields.length === 0 ? (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="m-5 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                <ClipboardListIcon className="size-6" />
                No products yet. Click to add some.
              </button>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">SKU</TableHead>
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
                    <TableRow key={line.id} className="[&>td:first-child]:pl-5">
                      <TableLineProduct sku={line.sku} title={line.description} product={lineProduct(line.productId)} />
                      <TableCell className="text-right tabular-nums">{format.money(line.price)}</TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`lines.${index}.specialPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input className="w-28" inputMode="decimal" placeholder="—" aria-label="Special price" {...field} />
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
                                <Input className="w-20" inputMode="numeric" aria-label="Quantity" {...field} />
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
                                  <Input className="w-24" inputMode="decimal" placeholder="0" aria-label="Discount" {...field} />
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
                                    <SelectTrigger aria-label="Discount type">
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
                      <TableCell className="text-right font-medium tabular-nums">
                        {amounts[index] && format.money(amounts[index].total)}
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
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
              {linesError ? <p className="text-sm text-destructive">{linesError}</p> : <span />}
              <dl className="grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-right text-sm sm:ml-auto">
                {totals.map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="tabular-nums">{format.money(value)}</dd>
                  </div>
                ))}
                <dt className="border-t pt-2 text-base font-semibold">Total</dt>
                <dd className="border-t pt-2 text-base font-semibold tabular-nums">{format.money(sum((line) => line.total))}</dd>
              </dl>
            </div>
            <ProductPickerDialog
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              addedIds={lineValues.map((line) => line.productId)}
              onAdd={addProduct}
            />
          </Card>
        )}
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
