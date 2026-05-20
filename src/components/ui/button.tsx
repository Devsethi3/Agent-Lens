import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils/cn'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-primary text-primary-foreground shadow hover:bg-primary/90':
              variant === 'default',
            'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90':
              variant === 'destructive',
            'border border-border bg-background shadow-sm hover:bg-foreground/5':
              variant === 'outline',
            'hover:bg-foreground/5': variant === 'ghost'
          },
          {
            'h-9 px-4 py-2': size === 'default',
            'h-8 rounded-md px-3 text-xs': size === 'sm',
            'h-10 rounded-md px-8': size === 'lg',
            'h-9 w-9': size === 'icon'
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }