import { FormControl } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { useCountries, useCountryName } from "./api"

interface CountrySelectProps {
  value: string
  onChange: (code: string) => void
}

/** A form field's country (customer, supplier, company settings): the alpha-3 code, picked by name. */
export function CountrySelect({ value, onChange }: CountrySelectProps) {
  const countries = useCountries()
  return (
    <Select value={value} onValueChange={onChange}>
      <FormControl>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={countries.isPending ? "Loading…" : "Choose a country"} />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {countries.data?.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            {country.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** A country's name from its code, e.g. in a table cell. */
export function CountryName({ code }: { code: string }) {
  return useCountryName()(code)
}
