"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type ToastState = { message: string; type: "success" | "error" }

export function useToast(durationMs = 3000) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const hideToast = useCallback(() => {
    clearTimer()
    setToast(null)
  }, [clearTimer])

  const showToast = useCallback(
    (message: string, type: ToastState["type"]) => {
      clearTimer()
      setToast({ message, type })
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        setToast(null)
      }, durationMs)
    },
    [clearTimer, durationMs]
  )

  useEffect(() => clearTimer, [clearTimer])

  return { toast, showToast, hideToast }
}
