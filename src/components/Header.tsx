import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './Avatar';
import { Button } from './Button';
import {
  Sparkles,
  Menu,
  X,
  Calendar,
  User,
  LogOut,
  Flame,
  Search,
  BookOpen,
  ShieldCheck,
  ChevronDown,
  Bell,
  Send,
  MessageSquare,
  Gift
} from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { NotificationBell } from './NotificationBell';

export const Header: React.FC = () => {
  const { currentUser, role, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const count = await notificationService.getUnreadCount(currentUser?.id || '');
        setUnreadCount(count);
      } catch {
        // ignore
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 4000);
    return () => clearInterval(interval);
  }, [currentUser, location.pathname]);

  const handleLogout = async () => {
    await logout();
    setUserDropdownOpen(false);
    navigate('/login');
  };

  const navLinks = [
    { label: 'Home', path: '/home' },
    { label: 'AI Planner', path: '/ceremony-planner', isAI: true },
    { label: 'Find a Priest', path: '/priests' },
    { label: 'Puja Events', path: '/events' },
    { label: 'Requests', path: '/requests', highlight: true },
    { label: 'My Bookings', path: '/bookings' },
    { label: 'Rewards', path: '/rewards', isRewards: true },
  ];

  return (
    <header className="bg-[#faf8f5]/95 backdrop-blur-md border-b border-[#eadfd9] shadow-xs sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-[#701a28] rounded-full flex items-center justify-center text-white shadow-md shadow-[#701a28]/25 group-hover:scale-105 transition-transform">
              <Flame className="w-5 h-5 fill-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight text-[#22060a] leading-tight">
                Purohit<span className="text-[#701a28]">Seva</span>
              </span>
              <span className="text-[10px] font-semibold text-[#8c2433] tracking-widest uppercase leading-none">
                Sacred Services
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                    isActive
                      ? 'text-[#701a28] bg-[#fdf2f4] font-semibold border border-[#f5ccd2]/70 shadow-xs'
                      : 'text-stone-700 hover:text-[#701a28] hover:bg-[#f8eee8]'
                  }`}
                >
                  {link.highlight && <Send className="w-3.5 h-3.5 text-[#701a28]" />}
                  {link.isRewards && <Gift className="w-3.5 h-3.5 text-[#701a28]" />}
                  {link.isAI && <Sparkles className="w-3.5 h-3.5 text-[#e5b869]" />}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Header CTAs / Notifications & User Profile */}
          <div className="hidden md:flex items-center gap-3">
            {/* Real-time Notification Bell & Popover */}
            <NotificationBell role="customer" />

            {isAuthenticated ? (
              <div className="relative flex items-center">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-3 pl-3 border-l border-stone-200 hover:opacity-90 transition cursor-pointer"
                >
                  <div className="text-right">
                    <p className="text-xs font-bold text-stone-900 leading-none truncate max-w-[130px]">
                      {currentUser?.name}
                    </p>
                    <p className="text-[10px] text-stone-500 mt-0.5">
                      {currentUser?.city || 'Bengaluru, KA'}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-[#fdf2f4] border-2 border-[#f5ccd2] flex items-center justify-center overflow-hidden shadow-xs text-[#701a28] font-bold text-xs">
                    {currentUser?.avatarUrl ? (
                      <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      currentUser?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'PS'
                    )}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 top-12 mt-1 w-56 bg-[#ffffff] rounded-2xl shadow-xl border border-[#eadfd9] p-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2 border-b border-stone-100 mb-1">
                      <p className="text-xs font-bold text-stone-900 truncate">{currentUser?.name}</p>
                      <p className="text-[11px] text-stone-500 truncate">{currentUser?.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-[#fdf2f4] text-[10px] font-bold text-[#701a28] rounded capitalize">
                        {role || 'Customer'}
                      </span>
                    </div>

                    <Link
                      to="/rewards"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#701a28] bg-[#fdf2f4] hover:bg-[#fae4e7] rounded-xl transition"
                    >
                      <Gift className="w-4 h-4 text-[#701a28]" />
                      <span>Purohit Seva Rewards</span>
                    </Link>

                    <Link
                      to="/requests"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-[#fdf2f4] hover:text-[#701a28] rounded-xl transition"
                    >
                      <Send className="w-4 h-4 text-[#701a28]" />
                      <span>My Requests</span>
                    </Link>

                    <Link
                      to="/bookings"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-[#fdf2f4] hover:text-[#701a28] rounded-xl transition"
                    >
                      <Calendar className="w-4 h-4 text-[#701a28]" />
                      <span>My Bookings</span>
                    </Link>

                    <Link
                      to="/notifications"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-[#fdf2f4] hover:text-[#701a28] rounded-xl transition"
                    >
                      <Bell className="w-4 h-4 text-[#701a28]" />
                      <span>Notifications</span>
                      {unreadCount > 0 && (
                        <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#701a28] text-white">
                          {unreadCount}
                        </span>
                      )}
                    </Link>

                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-[#fdf2f4] hover:text-[#701a28] rounded-xl transition"
                    >
                      <User className="w-4 h-4 text-stone-500" />
                      <span>Customer Profile</span>
                    </Link>

                    {role === 'priest' && (
                      <Link
                        to="/priest/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#701a28] hover:bg-[#fdf2f4] rounded-xl transition"
                      >
                        <Flame className="w-4 h-4" />
                        <span>Priest Dashboard</span>
                      </Link>
                    )}

                    {role === 'admin' && (
                      <Link
                        to="/admin/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#701a28] hover:bg-[#fdf2f4] rounded-xl transition"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Admin Console</span>
                      </Link>
                    )}

                    <div className="border-t border-stone-100 my-1" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-xl transition cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Log In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Right Bar (Notification + Hamburger) */}
          <div className="flex items-center gap-2 md:hidden">
            <NotificationBell role="customer" />

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold ${
                  location.pathname === link.path
                    ? 'text-[#701a28] bg-[#fdf2f4] border border-[#f5ccd2]/70 font-semibold'
                    : 'text-stone-700 hover:bg-[#f8eee8]'
                }`}
              >
                <span>{link.label}</span>
                {link.highlight && (
                  <span className="text-[10px] bg-[#fdf2f4] text-[#701a28] border border-[#f5ccd2] px-2 py-0.5 rounded-full font-bold">
                    Requests
                  </span>
                )}
                {link.isAI && (
                  <span className="text-[10px] bg-[#e5b869]/20 text-[#701a28] border border-[#e5b869]/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#701a28]" />
                    AI
                  </span>
                )}
              </Link>
            ))}
          </div>

          <div className="border-t border-stone-200/80 pt-3 space-y-2">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 px-3 py-2 bg-[#fdf2f4] rounded-xl border border-[#f5ccd2]/60">
                  <Avatar src={currentUser?.avatarUrl} name={currentUser?.name} size="sm" />
                  <div>
                    <p className="text-xs font-bold text-stone-900">{currentUser?.name}</p>
                    <p className="text-[10px] text-stone-500">{currentUser?.email}</p>
                  </div>
                </div>

                <Link
                  to="/rewards"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-[#701a28] bg-[#fdf2f4] hover:bg-[#fae4e7] rounded-xl"
                >
                  <Gift className="w-4 h-4 text-[#701a28]" />
                  <span>🪔 Purohit Seva Rewards</span>
                </Link>

                <Link
                  to="/requests"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-[#f8eee8] rounded-xl"
                >
                  My Requests
                </Link>

                <Link
                  to="/bookings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-[#f8eee8] rounded-xl"
                >
                  My Bookings
                </Link>

                <Link
                  to="/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-[#f8eee8] rounded-xl"
                >
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#701a28] text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/priest/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-semibold text-[#701a28] hover:bg-[#fdf2f4] rounded-xl"
                >
                  Priest Portal
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 rounded-xl"
                >
                  Log Out
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" fullWidth>
                    Log In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="sm" fullWidth>
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
