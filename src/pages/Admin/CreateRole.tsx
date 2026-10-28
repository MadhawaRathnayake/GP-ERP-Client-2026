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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useCreateRole } from "@/hooks/useAdmin"
import { appPageIds } from "@/types/admin"

import { PageAccessList } from "./PageAccessList"

const roleSchema = z.object({
  name: z.string().trim().min(1, "Role name is required"),
  description: z.string().trim(),
  pages: z.array(z.enum(appPageIds)),
})

type RoleValues = z.infer<typeof roleSchema>

export function CreateRoleDialog() {
  const [open, setOpen] = useState(false)
  const createRole = useCreateRole()
  const form = useForm<RoleValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: "", description: "", pages: [] },
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
          <DialogDescription>Roles can be assigned to profiles once created.</DialogDescription>
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
              name="pages"
              render={({ field }) => (
                <FormItem>
                  <PageAccessList legend="Pages" value={field.value} onChange={field.onChange} />
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
