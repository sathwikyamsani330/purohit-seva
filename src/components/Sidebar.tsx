import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Flame,
  LayoutDashboard,
  Calendar,
  Layers,
  Clock,
  DollarSign,
  User,
  Users,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  LogOut,
  ChevronRight,
  BookOpen,
  Gift,
  Bell
} from 'lucide-react';

export interface SidebarProps {
  type: 'priest' | 'admin';
}

export const Sidebar: React.FC<SidebarProps> = ({ type }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const priestNavItems = [
    { label: 'Dashboard', path: '/priest/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'My Bookings', path: '/priest/bookings', icon: <Calendar className="w-5 h-5" /> },
    { label: 'Notifications', path: '/priest/notifications', icon: <Bell className="w-5 h-5" /> },
    { label: 'My Services', path: '/priest/services', icon: <Layers className="w-5 h-5" /> },
    { label: 'Availability Calendar', path: '/priest/availability', icon: <Clock className="w-5 h-5" /> },
    { label: 'Earnings & Payouts', path: '/priest/earnings', icon: <DollarSign className="w-5 h-5" /> },
    { label: 'Acharya Profile', path: '/priest/profile', icon: <User className="w-5 h-5" /> },
  ];

  const adminNavItems = [
    { label: 'Admin Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Notification Center', path: '/admin/notifications', icon: <Bell className="w-5 h-5" /> },
    { label: 'Priest Management', path: '/admin/priests', icon: <ShieldCheck className="w-5 h-5" /> },
    { label: 'Customer Management', path: '/admin/customers', icon: <Users className="w-5 h-5" /> },
    { label: 'Booking Management', path: '/admin/bookings', icon: <Calendar className="w-5 h-5" /> },
    { label: 'Protection & Reports', path: '/admin/protection', icon: <ShieldAlert className="w-5 h-5" /> },
    { label: 'Puja Event Catalog', path: '/admin/events', icon: <Layers className="w-5 h-5" /> },
    { label: 'Devotee Rewards', path: '/admin/rewards', icon: <Gift className="w-5 h-5" /> },
  ];

  const navItems = type === 'priest' ? priestNavItems : adminNavItems;

  const handleLogout = async () => {
    await logout();
    navigate(type === 'priest' ? '/priest/login' : '/admin/login');
  };

  return (
    <aside className="w-64 bg-[#200609] text-[#e8dfe2] border-r border-[#380c12] flex flex-col justify-between shrink-0 min-h-screen">
      <div>
        {/* Brand Banner */}
        <div className="p-6 border-b border-[#380c12]">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#701a28] flex items-center justify-center text-white shadow-md shadow-[#701a28]/30">
              <Flame className="w-5 h-5 fill-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-white block leading-tight">
                Purohit<span className="text-[#e5b869]">Seva</span>
              </span>
              <span className="text-[10px] font-semibold text-[#e5b869] uppercase tracking-widest block">
                {type === 'priest' ? 'Priest Workspace' : 'Admin Console'}
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation links */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                  isActive
                    ? 'bg-[#701a28] text-white shadow-xs'
                    : 'text-[#c7b5b8] hover:text-white hover:bg-[#340b12]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-[#f5ccd2]" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-4 border-t border-[#380c12] space-y-3">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-8 h-8 rounded-full bg-[#701a28]/60 text-[#f5ccd2] font-bold text-xs flex items-center justify-center border border-[#701a28]">
            {currentUser?.name?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{currentUser?.name || 'User'}</p>
            <p className="text-[10px] text-[#a49195] truncate">{currentUser?.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-950/50 hover:text-white rounded-xl transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit / Log Out</span>
        </button>
      </div>
    </aside>
  );
};
