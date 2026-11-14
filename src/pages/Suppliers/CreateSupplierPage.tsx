import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeftIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { z } from "zod"

import { useSettings } from "@/app/settings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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

const textFields = [
  { name: "code", label: "Code", placeholder: "SUP-ABC" },
  { name: "name", label: "Name", placeholder: "Supplier name" },
  { name: "phones", label: "Phones", placeholder: "+94771234567, +94112345678" },
  { name: "email", label: "Email", placeholder: "Optional" },
  { name: "houseNumber", label: "House number", placeholder: "Optional" },
  { name: "street", label: "Street", placeholder: "Optional" },
  { name: "city", label: "City", placeholder: "Optional" },
  { name: "district", label: "District", placeholder: "Optional" },
  { name: "province", label: "Province", placeholder: "Optional" },
  { name: "country", label: "Country", placeholder: "" }, // a CountrySelect
  { name: "vatNumber", label: "VAT number", placeholder: "Optional, e.g. 109860522-7000" },
  { name: "tinNumber", label: "TIN number", placeholder: "Optional, e.g. 109860522" },
  { name: "pvNumber", label: "PV number", placeholder: "Optional, e.g. PV-00300617" },
] as const

interface SupplierFormProps {
  title: string
  submitLabel: string
  pending: boolean
  // Edit passes the saved supplier; create starts empty.
  supplier?: Supplier
  onSubmit: (supplier: NewSupplier) => void
}

export function CreateSupplierPage() {
  const navigate = useNavigate()
  const createSupplier = useCreateSupplier()

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/suppliers">
          <ArrowLeftIcon />
          Back to suppliers
        </Link>
      </Button>
      <SupplierForm
        title="Create supplier"
        submitLabel="Create"
        pending={createSupplier.isPending}
        onSubmit={(supplier) =>
          createSupplier.mutate(supplier, { onSuccess: (created) => navigate(`/suppliers/${created.id}`) })
        }
      />
    </div>
  )
}

// Shared by the create and edit pages.
export function SupplierForm({ title, submitLabel, pending, supplier, onSubmit }: SupplierFormProps) {
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {textFields.map(({ name, label, placeholder }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    {name === "country" ? (
                      <CountrySelect value={field.value} onChange={field.onChange} />
                    ) : (
                      <FormControl>
                        <Input placeholder={placeholder} {...field} />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={pending || (supplier !== undefined && !form.formState.isDirty)}>
              {pending ? "Saving…" : submitLabel}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}
