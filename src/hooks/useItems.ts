import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { createItem, fetchItem, fetchItems } from "@/api/client"

export function useItems(q?: string) {
  return useQuery({
    queryKey: ["items", "list", q ?? ""],
    queryFn: () => fetchItems(q),
    placeholderData: keepPreviousData,
  })
}

export function useItem(id: string) {
  return useQuery({
    queryKey: ["items", "detail", id],
    queryFn: () => fetchItem(id),
  })
}

export function useCreateItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createItem,
    onSuccess: (item) => {
      void queryClient.invalidateQueries({ queryKey: ["items"] })
      toast.success(`Created "${item.name}"`)
    },
    onError: (error) => {
      toast.error(`Could not create item: ${error.message}`)
    },
  })
}
