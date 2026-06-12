"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AdminShortcutListener() {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Listen for Ctrl + Shift + A or Alt + Shift + A -> Payload CMS Admin
      if ((e.ctrlKey || e.altKey) && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault()
        window.open("/admin", "_blank", "noopener,noreferrer")
      }

      // Listen for Ctrl + Shift + M or Alt + Shift + M -> Medusa Admin
      if ((e.ctrlKey || e.altKey) && e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault()
        const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
        window.open(`${backendUrl}/app`, "_blank", "noopener,noreferrer")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [router])

  return null
}

