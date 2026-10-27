import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Placeholder: not connected to any data yet.
export function ProfilePage() {
  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Profile settings</CardTitle>
        <CardDescription>Update your name and email.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => event.preventDefault()} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="profile-name">Name</Label>
            <Input id="profile-name" placeholder="Your name" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" type="email" placeholder="you@example.com" />
          </div>
          <Button type="submit">Save</Button>
        </form>
      </CardContent>
    </Card>
  )
}
