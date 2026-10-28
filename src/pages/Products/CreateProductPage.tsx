import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronDownIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { useCreateProduct } from "./api"
import type { NewProduct } from "./types"

const statuses = ["active", "inactive"] as const satisfies readonly NewProduct["status"][]

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  status: z.enum(statuses),
})

type FormValues = z.infer<typeof schema>

export function CreateProductPage() {
  const navigate = useNavigate()
  const createProduct = useCreateProduct()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", status: "active" },
  })

  const onSubmit = (values: FormValues) => {
    createProduct.mutate(values, { onSuccess: () => navigate("/products") })
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Create product</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Product name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <DropdownMenu>
                    <FormControl>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between capitalize">
                          {field.value}
                          <ChevronDownIcon />
                        </Button>
                      </DropdownMenuTrigger>
                    </FormControl>
                    <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
                      <DropdownMenuRadioGroup value={field.value} onValueChange={field.onChange}>
                        {statuses.map((status) => (
                          <DropdownMenuRadioItem key={status} value={status} className="capitalize">
                            {status}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={createProduct.isPending}>
              {createProduct.isPending ? "Creating…" : "Create"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
