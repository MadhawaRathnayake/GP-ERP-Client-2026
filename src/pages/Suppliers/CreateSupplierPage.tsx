import { zodResolver } from "@hookform/resolvers/zod"
import { IdCardIcon, LandmarkIcon, MapPinIcon, PhoneIcon, SaveIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { z } from "zod"

import { useSettings } from "@/app/settings"
import { FormSection, RequiredMark } from "@/components/FormSection"
import { TopBarActions } from "@/components/TopBarActions"
import { BackButton, TopBarButton } from "@/components/TopBarButton"
import { Card } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { CountrySelect } from "@/pages/Countries/CountrySelect"

import { useCreateSupplier } from "./api"
import type { NewSupplier, Supplier } from "./types"

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

// Matches the server's rules so mistakes show next to the field.
const schema = z.object({
  code: z.string().trim().min(1, "Code is required").max(64),
  name: z.string().trim().min(1, "Name is required").max(200),
  phones: z
    .string()
    .refine((value) => splitPhones(value).every((phone) => /^\+?\d{7,15}$/.test(phone)), "Enter phone numbers like +94771234567, separated by commas")
    .refine((value) => splitPhones(value).length <= 10, "Up to 10 phone numbers"),
  email: z.union([z.literal(""), z.email("Enter a valid email")]),
  houseNumber: optionalText(50),
  street: optionalText(200),
  city: optionalText(100),
  district: optionalText(100),
  province: optionalText(100),
  country: z.string().length(3, "Choose a country"),
  vatNumber: optionalMatch(/^\d{9}-\d{4}$/, "Enter a VAT number like 109860522-7000"),
  tinNumber: optionalMatch(/^\d{9}$/, "Enter a TIN number like 109860522"),
  pvNumber: optionalMatch(/^PV-\d+$/, "Enter a PV number like PV-00300617"),
})

type SupplierValues = z.infer<typeof schema>

interface TextFieldSpec {
  name: Exclude<keyof SupplierValues, "country">
  label: string
  placeholder?: string
  required?: boolean
  // Which keyboard a phone opens.
  keyboard?: "tel" | "email"
}

// The text boxes of each section, in order.
const supplierFields: TextFieldSpec[] = [
  { name: "name", label: "Name", placeholder: "Supplier name", required: true },
  { name: "code", label: "Code", placeholder: "SUP-ABC", required: true },
]
const contactFields: TextFieldSpec[] = [
  { name: "phones", label: "Phones", placeholder: "+94771234567, +94112345678", required: true, keyboard: "tel" },
  { name: "email", label: "Email", placeholder: "name@company.lk", keyboard: "email" },
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

interface SupplierFormProps {
  title: string
  submitLabel: string
  // The top bar's back button.
  back: { to: string; label: string }
  pending: boolean
  // Edit passes the saved supplier; create starts empty.
  supplier?: Supplier
  onSubmit: (supplier: NewSupplier) => void
}

export function CreateSupplierPage() {
  const navigate = useNavigate()
  const createSupplier = useCreateSupplier()

  return (
    <SupplierForm
      title="New supplier"
      submitLabel="Create"
      back={{ to: "/suppliers", label: "Suppliers" }}
      pending={createSupplier.isPending}
      onSubmit={(supplier) =>
        createSupplier.mutate(supplier, { onSuccess: (created) => navigate(`/suppliers/${created.id}`) })
      }
    />
  )
}

// Shared by the create and edit pages. Same layout as the customer form.
export function SupplierForm({ title, submitLabel, back, pending, supplier, onSubmit }: SupplierFormProps) {
  const { data: settings } = useSettings()
  const form = useForm<SupplierValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: supplier?.code ?? "",
      name: supplier?.name ?? "",
      phones: supplier?.phones.join(", ") ?? "",
      email: supplier?.email ?? "",
      houseNumber: supplier?.houseNumber ?? "",
      street: supplier?.street ?? "",
      city: supplier?.city ?? "",
      district: supplier?.district ?? "",
      province: supplier?.province ?? "",
      // A new supplier starts in the company's country.
      country: supplier?.country ?? settings?.country ?? "",
      vatNumber: supplier?.vatNumber ?? "",
      tinNumber: supplier?.tinNumber ?? "",
      pvNumber: supplier?.pvNumber ?? "",
    },
  })

  // Blank optional fields are saved as null.
  const submit = (values: SupplierValues) => {
    onSubmit({
      code: values.code,
      name: values.name,
      country: values.country,
      phones: splitPhones(values.phones),
      email: values.email || null,
      houseNumber: values.houseNumber || null,
      street: values.street || null,
      city: values.city || null,
      district: values.district || null,
      province: values.province || null,
      vatNumber: values.vatNumber || null,
      tinNumber: values.tinNumber || null,
      pvNumber: values.pvNumber || null,
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
          form="supplier-form"
          icon={SaveIcon}
          label={pending ? "Saving…" : submitLabel}
          disabled={pending || (supplier !== undefined && !form.formState.isDirty)}
        />
      </TopBarActions>

      <form id="supplier-form" onSubmit={form.handleSubmit(submit)} className="mx-auto max-w-6xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <Card className="gap-0 divide-y py-0 shadow-card">
          <FormSection title="Supplier" description="Their name and the code used on documents." icon={IdCardIcon} tone="blue">
            {supplierFields.map(textField)}
          </FormSection>

          <FormSection title="Contact" description="Separate several phone numbers with commas." icon={PhoneIcon} tone="teal">
            {contactFields.map(textField)}
          </FormSection>

          <FormSection title="Address" description="Printed on purchase orders." icon={MapPinIcon} tone="violet">
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
        </Card>
      </form>
    </Form>
  )
}
