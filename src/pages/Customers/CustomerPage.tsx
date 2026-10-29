import { ArrowLeftIcon } from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { useFormat } from "@/app/settings"
import { QueryError } from "@/components/StatusView"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { useCustomer } from "./api"

export function CustomerPage() {
  const { id = "" } = useParams()
  const format = useFormat()
  const { data: customer, isPending, isError, error } = useCustomer(id)

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/customers">
          <ArrowLeftIcon />
          Back to customers
        </Link>
      </Button>
      {isPending ? (
        <p className="text-sm text-muted-foreground">Loading customer…</p>
      ) : isError ? (
        <QueryError error={error} />
      ) : (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{customer.name}</CardTitle>
            <CardDescription>{customer.code}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{customer.email ?? "—"}</dd>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{customer.phone ?? "—"}</dd>
              <dt className="text-muted-foreground">Credit limit</dt>
              <dd>{format.money(customer.creditLimit)}</dd>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{format.dateTime(customer.createdAt)}</dd>
              <dt className="text-muted-foreground">Updated</dt>
              <dd>{format.dateTime(customer.updatedAt)}</dd>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
