import React from 'react';
import { Star } from 'lucide-react';

export interface RatingProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  reviewCount?: number;
  interactive?: boolean;
  onChange?: (val: number) => void;
}

export const Rating: React.FC<RatingProps> = ({
  value,
  max = 5,
  size = 'md',
  showNumber = true,
  reviewCount,
  interactive = false,
  onChange
}) => {
  const sizeStyles = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, idx) => {
          const starValue = idx + 1;
          const isFilled = value >= starValue;
          const isHalf = !isFilled && value >= starValue - 0.5;

          return (
            <button
              key={idx}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onChange && onChange(starValue)}
              className={`${interactive ? 'cursor-pointer hover:scale-110 transition' : 'cursor-default'} text-amber-500`}
            >
              <Star
                className={`${sizeStyles[size]} ${
                  isFilled ? 'fill-amber-400 text-amber-400' : isHalf ? 'fill-amber-200 text-amber-400' : 'text-stone-300'
                }`}
              />
            </button>
          );
        })}
      </div>
      {showNumber && (
        <span className="text-xs font-bold text-stone-900 ml-0.5">
          {value.toFixed(1)}
        </span>
      )}
      {reviewCount !== undefined && (
        <span className="text-xs text-stone-500">
          ({reviewCount})
        </span>
      )}
    </div>
  );
};
