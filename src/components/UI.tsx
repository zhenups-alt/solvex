import React from 'react';
import { cn } from '../lib/utils';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => {
  return (
    <div className={cn('card', className)} {...props}>
      {children}
    </div>
  );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'border border-border-default text-text-secondary hover:text-text-primary hover:border-border-strong',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated',
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-5 text-sm',
    lg: 'h-12 px-8 text-base',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const Badge: React.FC<{ children: React.ReactNode, className?: string, variant?: 'default' | 'accent' | 'solana' | 'positive' | 'negative' | 'warning' }> = ({ children, className, variant = 'default', ...props }) => {
  const variants = {
    default: 'bg-bg-elevated text-text-muted border-border-default',
    accent: 'bg-accent-dim text-accent border-accent-border',
    solana: 'bg-solana-dim text-solana border-solana-dim',
    positive: 'bg-positive-dim text-positive border-positive-dim',
    negative: 'bg-negative-dim text-negative border-negative-dim',
    warning: 'bg-warning-dim text-warning border-warning-dim',
  };

  return (
    <span className={cn('px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border', variants[variant], className)} {...props}>
      {children}
    </span>
  );
};
