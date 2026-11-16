import { zodResolver } from "@hookform/resolvers/zod"
import {
  Building2Icon,
  IdCardIcon,
  LandmarkIcon,
  MapPinIcon,
  PhoneIcon,
  SaveIcon,
  StickyNoteIcon,
  UserIcon,
} from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { z } from "zod"

import { useSettings } from "@/app/settings"
import { FormSection, RequiredMark } from "@/components/FormSection"
import { TopBarActions } from "@/components/TopBarActions"
import { BackButton, TopBarButton } from "@/components/TopBarButton"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { CountrySelect } from "@/pages/Countries/CountrySelect"

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
  country: z.string().length(3, "Choose a country"),
  contactPerson: optionalText(200),
  contactPhones: phoneList,
  vatNumber: optionalMatch(/^\d{9}-\d{4}$/, "Enter a VAT number like 109860522-7000"),
  tinNumber: optionalMatch(/^\d{9}$/, "Enter a TIN number like 109860522"),
  pvNumber: optionalMatch(/^PV-\d+$/, "Enter a PV number like PV-00300617"),
  notes: optionalText(2000),
  isCommissioned: z.boolean(),
})

type CustomerValues = z.infer<typeof schema>
type TextName = Exclude<keyof CustomerValues, "type" | "country" | "isCommissioned">

interface TextFieldSpec {
  name: TextName
  label: string
  placeholder?: string
  required?: boolean
  // Which keyboard a phone opens.
  keyboard?: "tel" | "email"
}

// The text boxes of each card, in order.
const contactFields: TextFieldSpec[] = [
  { name: "phones", label: "Phones", placeholder: "+94771234567, +94112345678", required: true, keyboard: "tel" },
  { name: "email", label: "Email", placeholder: "name@company.lk", keyboard: "email" },
  { name: "contactPerson", label: "Contact person" },
  { name: "contactPhones", label: "Contact phones", placeholder: "+94771234567", keyboard: "tel" },
]
const addressFields: TextFieldSpec[] = [
  { name: "houseNumber", label: "House number" },
  { name: "street", label: "Street" },
  { name: "city", label: "City" },
  { name: "district", label: "District" },
  { name: "province", label: "Province" },
]
const taxFields: TextFieldSpec[] = [
  { name: "vatNumber", label: "VAT number", placeholder: "109860522-7000" },
  { name: "tinNumber", label: "TIN number", placeholder: "109860522" },
  { name: "pvNumber", label: "PV number", placeholder: "PV-00300617" },
]

const customerTypes = [
  { value: "B2B", label: "Business", icon: Building2Icon },
  { value: "B2C", label: "Person", icon: UserIcon },
] as const

interface CustomerFormProps {
  title: string
  submitLabel: string
  // The top bar's back button.
  back: { to: string; label: string }
  pending: boolean
  // Edit passes the saved customer; create starts empty.
  customer?: Customer
  onSubmit: (customer: NewCustomer) => void
}

export function CreateCustomerPage() {
  const navigate = useNavigate()
  const createCustomer = useCreateCustomer()

  return (
    <CustomerForm
      title="New customer"
      submitLabel="Create"
      back={{ to: "/customers", label: "Customers" }}
      pending={createCustomer.isPending}
      onSubmit={(customer) =>
        createCustomer.mutate(customer, { onSuccess: (created) => navigate(`/customers/${created.id}`) })
      }
    />
  )
}

// Shared by the create and edit pages.
export function CustomerForm({ title, submitLabel, back, pending, customer, onSubmit }: CustomerFormProps) {
  const { data: settings } = useSettings()
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
      // A new customer starts in the company's country.
      country: customer?.country ?? settings?.country ?? "",
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

  const textField = ({ name, label, placeholder, required, keyboard }: TextFieldSpec) => (
    <FormField
      key={name}
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && <RequiredMark />}
          </FormLabel>
          <FormControl>
            <Input placeholder={placeholder} inputMode={keyboard} type={keyboard === "email" ? "email" : "text"} {...field} />
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
          form="customer-form"
          icon={SaveIcon}
          label={pending ? "Saving…" : submitLabel}
          disabled={pending || (customer !== undefined && !form.formState.isDirty)}
        />
      </TopBarActions>

      <form id="customer-form" onSubmit={form.handleSubmit(submit)} className="mx-auto max-w-6xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <Card className="gap-0 divide-y py-0 shadow-card">
          <FormSection title="Customer" description="Who they are and the code used on documents." icon={IdCardIcon} tone="blue">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  {/* One tap on the TC21. A business can't have a title, so picking one clears it. */}
                  <div role="radiogroup" aria-label="Type" className="grid h-9 grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                    {customerTypes.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={field.value === value}
                        onClick={() => {
                          field.onChange(value)
                          if (value === "B2B") form.setValue("title", "", { shouldValidate: true })
                        }}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                          field.value === value
                            ? "bg-card text-primary shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
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
            {isPerson && textField({ name: "title", label: "Title", placeholder: "Mr, Mrs, Dr" })}
            {textField({ name: "name", label: "Name", placeholder: "Customer or company name", required: true })}
            {textField({ name: "code", label: "Code", placeholder: "CUS-ABC", required: true })}
          </FormSection>

          <FormSection title="Contact" description="Separate several phone numbers with commas." icon={PhoneIcon} tone="teal">
            {contactFields.map(textField)}
          </FormSection>

          <FormSection title="Address" description="Printed on quotations and invoices." icon={MapPinIcon} tone="violet">
            {addressFields.map(textField)}
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Country
                    <RequiredMark />
                  </FormLabel>
                  <CountrySelect value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>

          <FormSection title="Tax and registration" description="Only for registered businesses." icon={LandmarkIcon} tone="amber">
            {taxFields.map(textField)}
          </FormSection>

          <FormSection title="Other" description="Notes for the team and commission." icon={StickyNoteIcon} tone="rose">
            <div className="sm:col-span-2">
              {textField({ name: "notes", label: "Notes", placeholder: "Anything the team should know" })}
            </div>
            <FormField
              control={form.control}
              name="isCommissioned"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 rounded-lg border p-3 lg:self-end">
                  <FormControl>
                    <Checkbox
                      className="mt-0.5"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  </FormControl>
                  <div className="space-y-0.5">
                    <FormLabel>Commissioned</FormLabel>
                    <p className="text-xs text-muted-foreground">A commission is paid on their sales.</p>
                  </div>
                </FormItem>
              )}
            />
          </FormSection>
        </Card>
      </form>
    </Form>
  )
}
