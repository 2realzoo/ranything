import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary font-sans',
          'placeholder:text-text-muted',
          'focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent/60',
          'hover:border-border/80',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'resize-none transition-colors duration-150',
          'scrollbar-thin',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
