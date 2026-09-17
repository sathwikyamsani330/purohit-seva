import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  fullHeight?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading auspicious details...',
  fullHeight = false
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center ${
        fullHeight ? 'min-h-[60vh]' : 'py-12'
      }`}
    >
      <div className="relative mb-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>
        <Loader2 className="w-6 h-6 text-amber-600 animate-spin absolute -bottom-1 -right-1" />
      </div>
      <p className="text-sm font-semibold text-stone-700">{message}</p>
      <p className="text-xs text-stone-400 mt-1">Purohit Seva Vedic Network</p>
    </div>
  );
};
