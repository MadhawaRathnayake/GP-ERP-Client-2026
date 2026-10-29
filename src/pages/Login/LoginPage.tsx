import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Navigate, useNavigate, useSearchParams } from "react-router-dom"
import { z } from "zod"

import { useLogin, useMe } from "@/app/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const schema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
})

type LoginValues = z.infer<typeof schema>

// Only paths inside this app; "//evil.com" or "/\evil.com" would leave the site (open redirect).
function safeRedirect(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/"
}

export function LoginPage() {
  const me = useMe()
  const login = useLogin()
  const navigate = useNavigate()
  // AppLayout sends signed-out users here with ?redirect=<the page they wanted>; go back there afterwards.
  const [searchParams] = useSearchParams()
  const returnTo = safeRedirect(searchParams.get("redirect"))
  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  if (me.isSuccess) return <Navigate to={returnTo} replace />

  const onSubmit = (values: LoginValues) => {
    login.mutate(values, { onSuccess: () => navigate(returnTo, { replace: true }) })
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <img src="/logo.webp" alt="Gunda Power" className="mx-auto h-12 w-auto" />
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use your GP ERP account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {login.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {login.error.message}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={login.isPending}>
                {login.isPending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
