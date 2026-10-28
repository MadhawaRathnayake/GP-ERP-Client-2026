import axios from "axios"

// Serve in-memory data until a backend exists. Set to false to use the real API.
export const USE_MOCK = true

export const http = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) || "/api",
  // Send the session cookie to the API (it may be on another port/origin).
  withCredentials: true,
})

// Simulates network latency for mock responses.
export const mockDelay = () => new Promise((resolve) => setTimeout(resolve, 400))
