import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'purple' | 'info' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  outline?: boolean;
  pill?: boolean;
}

const variantStyles = {
  default: {
    solid: 'bg-gray-100 text-gray-800',
    outline: 'bg-transparent text-gray-800 border border-gray-300'
  },
  primary: {
    solid: 'bg-emerald-100 text-emerald-800',
    outline: 'bg-transparent text-emerald-700 border border-emerald-300'
  },
  success: {
    solid: 'bg-green-100 text-green-800',
    outline: 'bg-transparent text-green-700 border border-green-300'
  },
  error: {
    solid: 'bg-red-100 text-red-800',
    outline: 'bg-transparent text-red-700 border border-red-300'
  },
  warning: {
    solid: 'bg-yellow-100 text-yellow-800',
    outline: 'bg-transparent text-yellow-700 border border-yellow-300'
  },
  purple: {
    solid: 'bg-purple-100 text-purple-800',
    outline: 'bg-transparent text-purple-700 border border-purple-300'
  },
  info: {
    solid: 'bg-blue-100 text-blue-800',
    outline: 'bg-transparent text-blue-700 border border-blue-300'
  }
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base'
};

export function Badge({ 
  children, 
  variant = 'default', 
  size = 'sm',
  outline = false,
  pill = true
}: BadgeProps) {
  const style = outline ? variantStyles[variant].outline : variantStyles[variant].solid;
  const sizeStyle = sizeStyles[size];
  const roundedStyle = pill ? 'rounded-full' : 'rounded-md';
  
  return (
    <span
      className={`inline-flex items-center font-medium ${style} ${sizeStyle} ${roundedStyle}`}
    >
      {children}
    </span>
  );
}
