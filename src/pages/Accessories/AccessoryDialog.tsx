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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useProducts } from "@/pages/Products/api"

import { useCreateAccessory, useUpdateAccessory } from "./api"
import type { Accessory } from "./types"

// The Select can't hold an empty value, so "none" stands for no product.
const NONE = "none"

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Use at most 100 characters"),
  description: z.string().trim().max(500, "Use at most 500 characters"),
  productId: z.string(),
})

type AccessoryValues = z.infer<typeof schema>

interface AccessoryDialogProps {
  // Edit passes the saved accessory; create starts empty.
  accessory?: Accessory
  trigger: ReactNode
}

// Create or edit an accessory in a pop-up.
export function AccessoryDialog({ accessory, trigger }: AccessoryDialogProps) {
  const [open, setOpen] = useState(false)
  const products = useProducts()
  const createAccessory = useCreateAccessory()
  const updateAccessory = useUpdateAccessory()
  const pending = createAccessory.isPending || updateAccessory.isPending
  const saved = {
    name: accessory?.name ?? "",
    description: accessory?.description ?? "",
    productId: accessory?.productId ?? NONE,
  }
  const form = useForm<AccessoryValues>({ resolver: zodResolver(schema), defaultValues: saved })

  // Reset to the latest saved values each time, so a reopened edit dialog shows what was just saved.
  const onOpenChange = (next: boolean) => {
    setOpen(next)
    form.reset(saved)
  }

  const onSubmit = ({ productId, ...values }: AccessoryValues) => {
    const close = { onSuccess: () => onOpenChange(false) }
    const changes = { ...values, productId: productId === NONE ? null : productId }
    if (accessory) updateAccessory.mutate({ id: accessory.id, ...changes }, close)
    else createAccessory.mutate(changes, close)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{accessory ? `Edit ${accessory.name}` : "Create accessory"}</DialogTitle>
          <DialogDescription>
            Something that comes in a product&apos;s box with its own serial number, e.g. a WiFi module.
          </DialogDescription>
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
                    <Input placeholder="Solis S2-WL-ST WiFi module" {...field} />
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
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Also sold on its own as</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Not sold on its own</SelectItem>
                      {products.data
                        ?.filter((product) => !product.isDeleted || product.id === accessory?.productId)
                        .map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.sku} · {product.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
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
              <Button type="submit" disabled={pending || (accessory !== undefined && !form.formState.isDirty)}>
                {pending ? "Saving…" : accessory ? "Save" : "Create accessory"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
