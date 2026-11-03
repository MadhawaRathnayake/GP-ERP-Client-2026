import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeftIcon } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

import { useCreateCustomer } from "./api"
import type { Customer, NewCustomer } from "./types"

// Optional text: blank is allowed and saved as null.
const optionalText = (max: number) => z.string().trim().max(max)
const optionalMatch = (pattern: RegExp, message: string) =>
  z.string().trim().refine((value) => value === "" || pattern.test(value), message)

// Phones are typed as one comma-separated line and split on submit.
const splitPhones = (value: string) =>
  value
    .split(",")
    .map((phone) => phone.trim())
    .filter(Boolean)

const phoneList = z
  .string()
  .refine(
    (value) => splitPhones(value).every((phone) => /^\+?\d{7,15}$/.test(phone)),
    "Enter phone numbers like +94771234567, separated by commas",
  )
  .refine((value) => splitPhones(value).length <= 10, "Up to 10 phone numbers")

// Matches the server's rules so mistakes show next to the field. isActive, isDormant, lastInvoiceDate and
// totalInvoices aren't here: the system sets them from invoices.
const schema = z.object({
  code: z.string().trim().min(1, "Code is required").max(64),
  type: z.enum(["B2B", "B2C"]),
  title: optionalText(20),
  name: z.string().trim().min(1, "Name is required").max(200),
  phones: phoneList,
  email: z.union([z.literal(""), z.email("Enter a valid email")]),
  houseNumber: optionalText(50),
  street: optionalText(200),
  city: optionalText(100),
  district: optionalText(100),
  province: optionalText(100),
  country: z.string().trim().min(1, "Country is required").max(100),
  contactPerson: optionalText(200),
  contactPhones: phoneList,
  vatNumber: optionalMatch(/^\d{9}-\d{4}$/, "Enter a VAT number like 109860522-7000"),
  tinNumber: optionalMatch(/^\d{9}$/, "Enter a TIN number like 109860522"),
  pvNumber: optionalMatch(/^PV-\d+$/, "Enter a PV number like PV-00300617"),
  notes: optionalText(2000),
  isCommissioned: z.boolean(),
})

type CustomerValues = z.infer<typeof schema>

// Plain text boxes, in the order they appear after Type (and Title, for B2C).
const textFields = [
  { name: "code", label: "Code", placeholder: "CUS-ABC" },
  { name: "name", label: "Name", placeholder: "Customer or company name" },
  { name: "phones", label: "Phones", placeholder: "+94771234567, +94112345678" },
  { name: "email", label: "Email", placeholder: "Optional" },
  { name: "contactPerson", label: "Contact person", placeholder: "Optional" },
  { name: "contactPhones", label: "Contact phones", placeholder: "Optional, e.g. +94771234567" },
  { name: "houseNumber", label: "House number", placeholder: "Optional" },
  { name: "street", label: "Street", placeholder: "Optional" },
  { name: "city", label: "City", placeholder: "Optional" },
  { name: "district", label: "District", placeholder: "Optional" },
  { name: "province", label: "Province", placeholder: "Optional" },
  { name: "country", label: "Country", placeholder: "Sri Lanka" },
  { name: "vatNumber", label: "VAT number", placeholder: "Optional, e.g. 109860522-7000" },
  { name: "tinNumber", label: "TIN number", placeholder: "Optional, e.g. 109860522" },
  { name: "pvNumber", label: "PV number", placeholder: "Optional, e.g. PV-00300617" },
  { name: "notes", label: "Notes", placeholder: "Optional", wide: true },
] as const

interface CustomerFormProps {
  title: string
  submitLabel: string
  pending: boolean
  // Edit passes the saved customer; create starts empty.
  customer?: Customer
  onSubmit: (customer: NewCustomer) => void
}

export function CreateCustomerPage() {
  const navigate = useNavigate()
  const createCustomer = useCreateCustomer()

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/customers">
          <ArrowLeftIcon />
          Back to customers
        </Link>
      </Button>
      <CustomerForm
        title="Create customer"
        submitLabel="Create"
        pending={createCustomer.isPending}
        onSubmit={(customer) =>
          createCustomer.mutate(customer, { onSuccess: (created) => navigate(`/customers/${created.id}`) })
        }
      />
    </div>
  )
}

// Shared by the create and edit pages.
export function CustomerForm({ title, submitLabel, pending, customer, onSubmit }: CustomerFormProps) {
  const form = useForm<CustomerValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: customer?.code ?? "",
      type: customer?.type ?? "B2B",
      title: customer?.title ?? "",
      name: customer?.name ?? "",
      phones: customer?.phones.join(", ") ?? "",
      email: customer?.email ?? "",
      houseNumber: customer?.houseNumber ?? "",
      street: customer?.street ?? "",
      city: customer?.city ?? "",
      district: customer?.district ?? "",
      province: customer?.province ?? "",
      country: customer?.country ?? "",
      contactPerson: customer?.contactPerson ?? "",
      contactPhones: customer?.contactPhones.join(", ") ?? "",
      vatNumber: customer?.vatNumber ?? "",
      tinNumber: customer?.tinNumber ?? "",
      pvNumber: customer?.pvNumber ?? "",
      notes: customer?.notes ?? "",
      isCommissioned: customer?.isCommissioned ?? false,
    },
  })
  // Only a person (B2C) has a title.
  const isPerson = useWatch({ control: form.control, name: "type" }) === "B2C"

  // Blank optional fields are saved as null. A business never keeps a title.
  const submit = (values: CustomerValues) => {
    onSubmit({
      code: values.code,
      type: values.type,
      title: values.type === "B2C" ? values.title || null : null,
      name: values.name,
      country: values.country,
      phones: splitPhones(values.phones),
      email: values.email || null,
      houseNumber: values.houseNumber || null,
      street: values.street || null,
      city: values.city || null,
      district: values.district || null,
      province: values.province || null,
      contactPerson: values.contactPerson || null,
      contactPhones: splitPhones(values.contactPhones),
      vatNumber: values.vatNumber || null,
      tinNumber: values.tinNumber || null,
      pvNumber: values.pvNumber || null,
      notes: values.notes || null,
      isCommissioned: values.isCommissioned,
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
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(type) => {
                      field.onChange(type)
                      // A hidden title can't be seen or fixed, so clear it (and any error on it).
                      if (type === "B2B") form.setValue("title", "", { shouldValidate: true })
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="B2B">Business (B2B)</SelectItem>
                      <SelectItem value="B2C">Person (B2C)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isPerson && (
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional, e.g. Mr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {textFields.map(({ name, label, placeholder, ...options }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem className={cn("wide" in options && "sm:col-span-2")}>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input placeholder={placeholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <FormField
              control={form.control}
              name="isCommissioned"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 sm:col-span-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                  </FormControl>
                  <FormLabel>Commissioned</FormLabel>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={pending || (customer !== undefined && !form.formState.isDirty)}>
              {pending ? "Saving…" : submitLabel}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}
