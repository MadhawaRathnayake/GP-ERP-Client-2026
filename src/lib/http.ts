import axios, { isAxiosError } from "axios"

export const http = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) || "/api/v1",
  // Sends the httpOnly `sid` session cookie (the API is on another port/origin).
  withCredentials: true,
})

// Every failed request rejects with this, so `error.message` is the server's user-safe message.
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown
  readonly requestId: string | undefined
  // The request's path, e.g. "/auth/me".
  readonly requestPath: string | undefined

  constructor(
    status: number,
    code: string,
    message: string,
    options: { details?: unknown; requestId?: string; requestPath?: string } = {},
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = options.details
    this.requestId = options.requestId
    this.requestPath = options.requestPath
  }
}

interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown; requestId?: string }
}

http.interceptors.response.use(undefined, (error: unknown) => {
  if (!isAxiosError<ApiErrorBody>(error)) return Promise.reject(error)
  const requestPath = error.config?.url
  if (!error.response) {
    return Promise.reject(new ApiError(0, "NETWORK_ERROR", "Cannot reach the server", { requestPath }))
  }
  const body = error.response.data?.error
  // The frontend called an endpoint that does not exist: a bug here, not something the user did.
  if (body?.code === "ROUTE_NOT_FOUND") console.error(`API route not found: ${error.config?.method?.toUpperCase()} ${requestPath}`)
  return Promise.reject(
    new ApiError(
      error.response.status,
      body?.code ?? "UNKNOWN",
      body?.message ?? error.message,
      { details: body?.details, requestId: body?.requestId, requestPath },
    ),
  )
})

// The API caps `limit` at 100.
const PAGE_LIMIT = 100

// Reads every page of a paginated list ({ data, total }) so DataGrid can search, sort and page all rows in the browser.
export async function fetchAll<T>(path: string): Promise<T[]> {
  const fetchPage = async (page: number) =>
    (await http.get<{ data: T[]; total: number }>(path, { params: { page, limit: PAGE_LIMIT } })).data
  const first = await fetchPage(1)
  const pageCount = Math.ceil(first.total / PAGE_LIMIT)
  const rest = await Promise.all(Array.from({ length: Math.max(pageCount - 1, 0) }, (_, index) => fetchPage(index + 2)))
  return [first, ...rest].flatMap((page) => page.data)
}
