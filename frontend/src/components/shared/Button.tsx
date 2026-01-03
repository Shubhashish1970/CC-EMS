import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}) => {
  const baseStyles = 'font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';
  
  const variantStyles = {
    primary: 'bg-green-700 text-white hover:bg-green-800 shadow-lg shadow-green-200',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-50',
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" size={16} />}
      {children}
    </button>
  );
};

export default Button;

