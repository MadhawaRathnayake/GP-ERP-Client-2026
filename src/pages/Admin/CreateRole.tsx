import { zodResolver } from "@hookform/resolvers/zod"
import { ShieldPlusIcon } from "lucide-react"
import { useState } from "react"
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { useCreateRole } from "./api"

const roleSchema = z.object({
  name: z.string().trim().min(1, "Role name is required").max(60, "Use at most 60 characters"),
  description: z.string().trim().max(500, "Use at most 500 characters"),
  branchCode: z.string().trim().regex(/^[A-Z0-9]{1,10}$/, "Up to 10 capital letters or digits, e.g. GP01"),
})

type RoleValues = z.infer<typeof roleSchema>

export function CreateRoleDialog() {
  const [open, setOpen] = useState(false)
  const createRole = useCreateRole()
  const form = useForm<RoleValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: "", description: "", branchCode: "" },
  })

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) form.reset()
  }

  const onSubmit = (values: RoleValues) => {
    createRole.mutate(values, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ShieldPlusIcon />
          New role
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create role</DialogTitle>
          <DialogDescription>Choose its permissions afterwards with Edit in the roles list.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role name</FormLabel>
                  <FormControl>
                    <Input placeholder="Accountant" {...field} />
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
                    <Input placeholder="What this role can do" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="branchCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch code</FormLabel>
                  <FormControl>
                    <Input placeholder="GP01" {...field} onChange={(event) => field.onChange(event.target.value.toUpperCase())} />
                  </FormControl>
                  <FormDescription>Goes into the invoice numbers this role's users make, e.g. 26NOV_GP01_14.</FormDescription>
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
              <Button type="submit" disabled={createRole.isPending}>
                {createRole.isPending ? "Creating…" : "Create role"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
