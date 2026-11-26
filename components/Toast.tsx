"use client"

type ToastProps = {
  message: string
  type: "success" | "error"
  onClose: () => void
}

export default function Toast({
  message,
  type,
  onClose,
}: ToastProps) {
  const baseStyle =
    "fixed top-6 right-6 z-[130] px-6 py-4 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300"

  const typeStyle =
    type === "success"
      ? "bg-emerald-600/90 border-emerald-400 text-white"
      : "bg-red-600/90 border-red-400 text-white"

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${baseStyle} ${typeStyle}`}
    >
      <div className="flex items-center justify-between gap-6">
        <span>{message}</span>

        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="text-white/80 hover:text-white text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
