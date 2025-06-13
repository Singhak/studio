
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
      {toasts.map(function ({ id, toastTitle, toastDescription, toastAction, onDismiss, ...props }) {
        // Destructure onDismiss so it's not in ...props
        // props contains other valid ToastProps including the onOpenChange set by useToast
        const originalOnOpenChange = props.onOpenChange;

        return (
          <Toast
            key={id}
            {...props} // Spread the remaining valid ToastProps
            onOpenChange={(open) => {
              originalOnOpenChange?.(open); // Call the hook's onOpenChange (which handles dismiss)
              if (!open) {
                onDismiss?.(); // Call the toast-specific onDismiss callback if it exists
              }
            }}
          >
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
