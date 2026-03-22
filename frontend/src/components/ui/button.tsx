import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-sm active:scale-[0.98]',
        destructive:
          'bg-red-600 text-white hover:bg-red-700 shadow-sm active:scale-[0.98]',
        outline:
          'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-700 active:scale-[0.98]',
        secondary:
          'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 active:scale-[0.98]',
        ghost:
          'text-slate-600 hover:bg-slate-100 hover:text-slate-800 active:scale-[0.98]',
        link: 'text-blue-600 underline-offset-4 hover:underline p-0 h-auto',
        amber:
          'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 active:scale-[0.98]',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-7 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-6 text-base',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
