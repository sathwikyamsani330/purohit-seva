import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed cursor-pointer';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 min-h-[36px]',
    md: 'px-4 py-2 text-sm gap-2 min-h-[44px]',
    lg: 'px-6 py-3 text-base gap-2.5 min-h-[50px]'
  };

  const variantStyles = {
    primary: 'bg-[#701a28] hover:bg-[#59131e] text-white font-bold shadow-md shadow-[#701a28]/20 hover:shadow-lg hover:shadow-[#701a28]/30 focus:ring-[#701a28]/25',
    secondary: 'bg-[#22060a] hover:bg-[#380d14] text-white shadow-xs focus:ring-[#701a28]',
    outline: 'border border-[#eadfd9] bg-white hover:bg-[#fdf2f4] text-[#701a28] hover:border-[#701a28] focus:ring-[#701a28]/20',
    ghost: 'text-[#701a28] hover:bg-[#fdf2f4] focus:ring-[#701a28]/20',
    danger: 'bg-rose-700 hover:bg-rose-800 text-white focus:ring-rose-500 shadow-xs',
    gold: 'bg-gradient-to-br from-[#8a2232] to-[#701a28] hover:from-[#701a28] hover:to-[#59131e] text-white shadow-md shadow-[#701a28]/25 focus:ring-[#701a28]/25 font-bold'
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span className="truncate whitespace-nowrap">{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
