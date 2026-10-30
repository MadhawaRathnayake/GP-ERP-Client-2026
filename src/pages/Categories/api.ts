import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { http } from "@/lib/http"

import type { Category, CategoryUpdate, NewCategory } from "./types"

// Not paginated. Includes deleted categories, so they can be restored and old products still show their name.
export async function fetchCategories(): Promise<Category[]> {
  const { data } = await http.get<Category[]>("/categories", { params: { includeInactive: true } })
  return data
}

export async function createCategory(newCategory: NewCategory): Promise<Category> {
  const { data } = await http.post<Category>("/categories", newCategory)
  return data
}

export async function updateCategory({ id, ...changes }: CategoryUpdate): Promise<Category> {
  const { data } = await http.patch<Category>(`/categories/${id}`, changes)
  return data
}

// Soft delete: the server sets isActive = false, and refuses (409) while active products use the category.
export async function deleteCategory(id: string): Promise<void> {
  await http.delete(`/categories/${id}`)
}

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: fetchCategories, staleTime: 5 * 60_000 })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCategory,
    onSuccess: (category) => {
      void queryClient.invalidateQueries({ queryKey: ["categories"] })
      toast.success(`Created category "${category.name}"`)
    },
    onError: (error) => {
      toast.error(`Could not create category: ${error.message}`)
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateCategory,
    onSuccess: (category) => {
      void queryClient.invalidateQueries({ queryKey: ["categories"] })
      toast.success(`Saved category "${category.name}"`)
    },
    onError: (error) => {
      toast.error(`Could not save category: ${error.message}`)
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["categories"] })
      toast.success("Deleted the category")
    },
    onError: (error) => {
      toast.error(`Could not delete category: ${error.message}`)
    },
  })
}
