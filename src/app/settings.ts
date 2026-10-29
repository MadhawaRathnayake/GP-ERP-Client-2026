import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import { toast } from "sonner"

import { http } from "@/lib/http"

export interface Settings {
  currency: string
  country: string
  timezone: string
  updatedAt: string
  serverTime: string
}

export type SettingsUpdate = Partial<Pick<Settings, "currency" | "country" | "timezone">>

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await http.get<Settings>("/settings")).data,
    staleTime: 10 * 60_000,
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (changes: SettingsUpdate) => (await http.patch<Settings>("/settings", changes)).data,
    onSuccess: (settings) => {
      queryClient.setQueryData(["settings"], settings)
      toast.success("Saved company settings")
    },
    onError: (error) => {
      toast.error(`Could not save settings: ${error.message}`)
    },
  })
}

// Money and dates in the company's currency and timezone. Until settings load, numbers and dates use the browser's.
export function useFormat() {
  const { data } = useSettings()
  return useMemo(() => {
    const money = data
      ? new Intl.NumberFormat(undefined, { style: "currency", currency: data.currency })
      : new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: data?.timezone })
    const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: data?.timezone })
    return {
      money: (value: number) => money.format(value),
      date: (iso: string) => date.format(new Date(iso)),
      dateTime: (iso: string) => dateTime.format(new Date(iso)),
    }
  }, [data])
}
