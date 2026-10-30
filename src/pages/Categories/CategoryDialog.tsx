import { zodResolver } from "@hookform/resolvers/zod"
import { useState, type ReactNode } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { useCreateCategory, useUpdateCategory } from "./api"
import type { Category } from "./types"

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Use at most 100 characters"),
  description: z.string().trim().max(500, "Use at most 500 characters"),
})

type CategoryValues = z.infer<typeof schema>

interface CategoryDialogProps {
  // Edit passes the saved category; create starts empty.
  category?: Category
  trigger: ReactNode
}

// Create or edit a category in a pop-up.
export function CategoryDialog({ category, trigger }: CategoryDialogProps) {
  const [open, setOpen] = useState(false)
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const pending = createCategory.isPending || updateCategory.isPending
  const saved = { name: category?.name ?? "", description: category?.description ?? "" }
  const form = useForm<CategoryValues>({ resolver: zodResolver(schema), defaultValues: saved })

  // Reset to the latest saved values each time, so a reopened edit dialog shows what was just saved.
  const onOpenChange = (next: boolean) => {
    setOpen(next)
    form.reset(saved)
  }

  const onSubmit = (values: CategoryValues) => {
    const close = { onSuccess: () => onOpenChange(false) }
    if (category) updateCategory.mutate({ id: category.id, ...values }, close)
    else createCategory.mutate(values, close)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? `Edit ${category.name}` : "Create category"}</DialogTitle>
          <DialogDescription>Every product belongs to one category.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Inverters" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pending || (category !== undefined && !form.formState.isDirty)}>
                {pending ? "Saving…" : category ? "Save" : "Create category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
