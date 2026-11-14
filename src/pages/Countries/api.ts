import { useQuery } from "@tanstack/react-query"
import { useCallback } from "react"

import { http } from "@/lib/http"

// A country is stored as its ISO 3166-1 alpha-3 code ("LKA"); the server lists every one with its English name.
export interface Country {
  code: string
  name: string
}

/** Sri Lanka: printed addresses leave the country out for it. */
export const HOME_COUNTRY = "LKA"

export function useCountries() {
  return useQuery({
    queryKey: ["countries"],
    queryFn: async () => (await http.get<Country[]>("/countries")).data,
    staleTime: Infinity,
  })
}

/** code → English name ("LKA" → "Sri Lanka"); the code itself until the list loads. */
export function useCountryName() {
  const { data } = useCountries()
  return useCallback((code: string) => data?.find((country) => country.code === code)?.name ?? code, [data])
}
