import { ArrowLeftIcon } from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useItem } from "@/hooks/useItems"

export function ItemPage() {
  const { id = "" } = useParams()
  const { data: item, isPending, isError, error } = useItem(id)

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/items">
          <ArrowLeftIcon />
          Back to items
        </Link>
      </Button>
      {isPending ? (
        <p className="text-sm text-muted-foreground">Loading item…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{item.name}</CardTitle>
            <CardDescription>Item #{item.id}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="capitalize">{item.status}</dd>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{new Date(item.createdAt).toLocaleString()}</dd>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
