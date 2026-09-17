import React, { ReactNode } from 'react';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'emerald' | 'amber' | 'rose' | 'stone' | 'gold' | 'blue' | 'purple';
  size?: 'sm' | 'md';
  icon?: ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'stone',
  size = 'md',
  icon,
  className = ''
}) => {
  const variantStyles = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    amber: 'bg-[#fdf2f4] text-[#701a28] border-[#f5ccd2]',
    rose: 'bg-rose-50 text-rose-700 border-rose-200/80',
    stone: 'bg-[#faf8f5] text-stone-700 border-[#eadfd9]',
    gold: 'bg-[#fbf8ed] text-[#8d591c] border-[#ecd9a3] font-semibold',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200'
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5'
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border whitespace-nowrap ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
