import React, { ReactNode } from 'react';
import { Button } from './Button';
import { Sparkles } from 'lucide-react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionLink?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction
}) => {
  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto shadow-xs">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mb-4 shadow-xs">
        {icon || <Sparkles className="w-8 h-8" />}
      </div>

      <h3 className="text-lg font-bold text-stone-900 mb-2">{title}</h3>
      <p className="text-xs sm:text-sm text-stone-500 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
