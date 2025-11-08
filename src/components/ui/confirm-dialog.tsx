import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog"
import { Button } from "./button"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "default" | "destructive"
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = "Are you sure?",
  description,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onCancel()
              onOpenChange(false)
            }}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant}
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook for easier usage with async/await pattern
export function useConfirm() {
  const [state, setState] = React.useState<{
    open: boolean
    title?: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: "default" | "destructive"
    resolve?: (value: boolean) => void
  }>({
    open: false,
    description: "",
  })

  const confirm = React.useCallback(
    (
      description: string,
      options?: {
        title?: string
        confirmLabel?: string
        cancelLabel?: string
        variant?: "default" | "destructive"
      }
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          open: true,
          description,
          title: options?.title,
          confirmLabel: options?.confirmLabel,
          cancelLabel: options?.cancelLabel,
          variant: options?.variant,
          resolve,
        })
      })
    },
    []
  )

  const handleConfirm = React.useCallback(() => {
    state.resolve?.(true)
    setState((prev) => ({ ...prev, open: false }))
  }, [state.resolve])

  const handleCancel = React.useCallback(() => {
    state.resolve?.(false)
    setState((prev) => ({ ...prev, open: false }))
  }, [state.resolve])

  const ConfirmDialogComponent = React.useCallback(
    () => (
      <ConfirmDialog
        open={state.open}
        onOpenChange={(open) => {
          if (!open) handleCancel()
        }}
        title={state.title}
        description={state.description}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        variant={state.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ),
    [state, handleConfirm, handleCancel]
  )

  return { confirm, ConfirmDialog: ConfirmDialogComponent }
}

