// packages/ui/src/Button.tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  asChild?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      asChild = false,
      className = '',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = [
      'inline-flex items-center justify-center rounded-lg font-medium',
      'transition-all duration-200 touch-manipulation relative',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'hover:-translate-y-[1px] active:translate-y-0',
    ].join(' ');

    const sizeClasses = {
      md: 'px-6 py-2.5 text-base min-h-[44px]',
      lg: 'px-8 py-3.5 text-lg min-h-[52px] font-semibold tracking-wide',
    };

    const variantClasses = {
      primary: [
        'bg-gradient-to-b from-[var(--brass)] to-[var(--brass)]',
        'text-[var(--paper)] shadow-lg',
        'hover:from-[var(--gold)] hover:to-[var(--brass)]',
        'active:from-[var(--brass)] active:to-[var(--brass)]',
        'focus:ring-[var(--brass)]',
        'border border-[var(--brass)]',
      ].join(' '),
      secondary: [
        'bg-white bg-opacity-90 text-[var(--ink)]',
        'border-2 border-[var(--brass)] shadow-md',
        'hover:bg-[var(--paper)] hover:border-[var(--gold)]',
        'focus:ring-[var(--brass)]',
      ].join(' '),
      ghost: [
        'bg-transparent text-[var(--ink)]',
        'hover:bg-[var(--paper)] hover:bg-opacity-60',
        'focus:ring-[var(--ink)] border border-transparent',
        'hover:border-[var(--paper-edge)]',
      ].join(' '),
    };

    const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';

    const classes = [
      baseClasses,
      sizeClasses[size],
      variantClasses[variant],
      disabledClasses,
      className,
    ].join(' ');

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        className: classes,
        ref,
        ...props,
      });
    }

    return (
      <button ref={ref} className={classes} disabled={disabled} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
