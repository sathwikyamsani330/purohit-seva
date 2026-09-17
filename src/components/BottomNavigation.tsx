import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Calendar, User, Flame } from 'lucide-react';

export const BottomNavigation: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { label: 'Home', path: '/home', icon: <Home className="w-5 h-5" /> },
    { label: 'Priests', path: '/priests', icon: <Search className="w-5 h-5" /> },
    { label: 'Events', path: '/events', icon: <Flame className="w-5 h-5" /> },
    { label: 'Bookings', path: '/bookings', icon: <Calendar className="w-5 h-5" /> },
    { label: 'Profile', path: '/profile', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#faf8f5]/95 backdrop-blur-md border-t border-[#eadfd9] px-2 py-1.5 shadow-lg safe-area-inset-bottom">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/home' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition min-w-[56px] ${
                isActive
                  ? 'text-[#701a28] font-bold'
                  : 'text-stone-600 hover:text-[#701a28] font-medium'
              }`}
            >
              <span className={`p-1 rounded-lg ${isActive ? 'bg-[#fdf2f4] text-[#701a28]' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
