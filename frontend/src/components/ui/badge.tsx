import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-accent/15 text-accent border border-accent/30 hover:bg-accent/20',
        secondary:
          'bg-surface text-text-muted border border-border hover:bg-[#1a1a1f]',
        destructive:
          'bg-error/15 text-error border border-error/30 hover:bg-error/20',
        outline:
          'border border-accent/40 text-accent bg-transparent hover:bg-accent/10',
        success:
          'bg-success/15 text-success border border-success/30 hover:bg-success/20',
        amber:
          'bg-amber-500/10 text-accent border border-amber-500/25 font-mono text-[10px] tracking-wide',
        processing:
          'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse',
        pending:
          'bg-[#1e1e23] text-text-muted border border-border',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
