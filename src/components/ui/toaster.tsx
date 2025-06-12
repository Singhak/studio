
"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, toastTitle, toastDescription, toastAction, ...props }) { // Renamed properties
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {toastTitle && <ToastTitle>{toastTitle}</ToastTitle>}
              {toastDescription && (
                <ToastDescription>{toastDescription}</ToastDescription>
              )}
            </div>
            {toastAction}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
