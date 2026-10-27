import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function DashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Key metrics will appear here.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Nothing to show yet.</CardContent>
      </Card>
    </div>
  )
}
