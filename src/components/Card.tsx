import React, { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'bordered' | 'subtle' | 'gold';
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  hoverEffect = false,
  className = '',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-white border border-[#eadfd9] shadow-xs',
    elevated: 'bg-white border border-[#eadfd9] shadow-xl',
    bordered: 'bg-white border-2 border-[#eadfd9]',
    subtle: 'bg-[#faf8f5] border border-[#eadfd9]',
    gold: 'bg-white border border-[#f5ccd2] shadow-xs'
  };

  const hoverStyles = hoverEffect ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:border-[#701a28]/40' : '';

  return (
    <div className={`rounded-2xl p-5 ${variantStyles[variant]} ${hoverStyles} ${className}`} {...props}>
      {children}
    </div>
  );
};
