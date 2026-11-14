import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router-dom"

import { Providers } from "@/app/providers"
import { router } from "@/router"
import "@/index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      {/* Page changes run as transitions, so the current page stays on screen while the next one downloads. */}
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </Providers>
  </StrictMode>,
)
