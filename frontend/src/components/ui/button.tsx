import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

type Variant = 'primary' | 'ghost'
type Size = 'sm' | 'md'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-blue-600 to-emerald-500 text-white hover:from-blue-700 hover:to-emerald-600 shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30 focus-visible:outline-blue-600',
  ghost:
    'bg-slate-100 text-slate-900 border border-slate-200 hover:border-slate-300 hover:bg-slate-200 shadow-sm hover:shadow focus-visible:outline-slate-400',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-sm md:text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const classes = twMerge(
    clsx(
      'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
      'disabled:opacity-60 disabled:cursor-not-allowed',
      'active:scale-95 hover:scale-105',
      variants[variant],
      sizes[size],
      className,
    ),
  )
  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {loading && (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {children}
    </button>
  )
}

export default Button