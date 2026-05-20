import { Loader2 } from 'lucide-react'

interface LoadingOverlayProps {
  message: string
}

export function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm gap-4 p-6">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-foreground/80 text-center font-medium">{message}</p>
    </div>
  )
}