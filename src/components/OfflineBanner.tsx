import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <aside aria-label="Network status" className="bg-amber-950 text-amber-100 text-xs py-1.5 px-4 sticky top-0 z-50 flex items-center justify-center gap-2 border-b border-amber-800 shadow-sm">
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span className="font-medium text-center">
        Offline mode active. Local actions will sync once network connectivity is restored.
      </span>
    </aside>
  );
};
