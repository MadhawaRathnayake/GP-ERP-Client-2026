import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { useCan } from "@/app/auth"
import { useSettings, useUpdateSettings, type Settings } from "@/app/settings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { CountrySelect } from "@/pages/Countries/CountrySelect"

const isTimeZone = (timezone: string) => {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

const schema = z.object({
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code, e.g. LKR"),
  country: z.string().length(3, "Choose a country"),
  timezone: z.string().trim().refine(isTimeZone, "Use a time zone name, e.g. Asia/Colombo"),
  // Typed as text and converted on submit, like the other number fields.
  vatRate: z
    .string()
    .trim()
    .regex(/^\d{1,3}(\.\d{1,2})?$/, "Enter a percent, e.g. 18 or 7.5")
    .refine((value) => Number(value) <= 100, "Up to 100%"),
})

type SettingsValues = z.infer<typeof schema>

export function SettingsCard() {
  const settings = useSettings()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company settings</CardTitle>
        <CardDescription>Used to show money and dates across the app. New quotation and invoice lines use the VAT rate.</CardDescription>
      </CardHeader>
      {settings.isPending ? (
        <CardContent className="text-sm text-muted-foreground">Loading settings…</CardContent>
      ) : settings.isError ? (
        <CardContent className="text-sm text-destructive">Could not load settings: {settings.error.message}</CardContent>
      ) : (
        <SettingsForm settings={settings.data} />
      )}
    </Card>
  )
}

const toValues = (settings: Settings): SettingsValues => ({
  currency: settings.currency,
  country: settings.country,
  timezone: settings.timezone,
  vatRate: String(settings.vatRate),
})

// Mounts once settings have loaded, so the form starts with the saved values.
function SettingsForm({ settings }: { settings: Settings }) {
  const can = useCan()
  const canEdit = can("SETTINGS.EDIT")
  const updateSettings = useUpdateSettings()
  const form = useForm<SettingsValues>({
    resolver: zodResolver(schema),
    defaultValues: toValues(settings),
  })

  const onSubmit = (values: SettingsValues) => {
    updateSettings.mutate(
      { ...values, vatRate: Number(values.vatRate) },
      { onSuccess: (saved) => form.reset(toValues(saved)) },
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent>
          <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-4">
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input placeholder="LKR" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <CountrySelect value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time zone</FormLabel>
                  <FormControl>
                    <Input placeholder="Asia/Colombo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vatRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VAT (%)</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" placeholder="18" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </fieldset>
          {!canEdit && (
            <p className="mt-4 text-sm text-muted-foreground">Only roles the Super Admin has given Settings → Edit can change these.</p>
          )}
        </CardContent>
        {canEdit && (
          <CardFooter className="mt-4 justify-end">
            <Button type="submit" disabled={!form.formState.isDirty || updateSettings.isPending}>
              {updateSettings.isPending ? "Saving…" : "Save settings"}
            </Button>
          </CardFooter>
        )}
      </form>
    </Form>
  )
}
