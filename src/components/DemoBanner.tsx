import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, User, ShieldCheck, UserCheck, X } from 'lucide-react';

export const DemoBanner: React.FC = () => {
  const { currentUser, role, switchUserRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 bg-[#200609]/95 text-[#f5ccd2] text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg border border-[#701a28]/40 flex items-center gap-1.5 backdrop-blur-xs cursor-pointer hover:bg-[#200609]"
      >
        <Sparkles className="w-3.5 h-3.5 text-[#e5b869]" />
        <span>Demo Switcher ({role || 'Guest'})</span>
      </button>
    );
  }

  const handleSwitch = async (targetRole: 'customer' | 'priest' | 'admin') => {
    await switchUserRole(targetRole);
    if (targetRole === 'customer') {
      navigate('/home');
    } else if (targetRole === 'priest') {
      navigate('/priest/dashboard');
    } else if (targetRole === 'admin') {
      navigate('/admin/dashboard');
    }
  };

  return (
    <div className="bg-[#200609] text-[#e8dfe2] border-b border-[#380c12] text-xs py-2 px-4 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="bg-[#701a28]/40 text-[#f5ccd2] border border-[#701a28]/60 font-bold px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#e5b869]" /> Demo Mode
          </span>
          <span className="text-[#a49195] text-xs hidden sm:inline">
            Role: <strong className="text-[#e5b869] capitalize">{role || 'Customer'}</strong> ({currentUser?.name || 'Suresh Nair'})
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-[#a49195] hidden md:inline">Quick Switch View:</span>

          <button
            type="button"
            onClick={() => handleSwitch('customer')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
              role === 'customer' || location.pathname.startsWith('/home') || location.pathname === '/'
                ? 'bg-[#701a28] text-white shadow-xs'
                : 'bg-[#340b12] text-[#d4c5c8] hover:bg-[#441118]'
            }`}
          >
            <User className="w-3 h-3" />
            <span>Customer</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitch('priest')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
              role === 'priest' || location.pathname.startsWith('/priest')
                ? 'bg-[#701a28] text-white shadow-xs'
                : 'bg-[#340b12] text-[#d4c5c8] hover:bg-[#441118]'
            }`}
          >
            <UserCheck className="w-3 h-3" />
            <span>Priest Portal</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitch('admin')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
              role === 'admin' || location.pathname.startsWith('/admin')
                ? 'bg-[#701a28] text-white shadow-xs'
                : 'bg-[#340b12] text-[#d4c5c8] hover:bg-[#441118]'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>Admin</span>
          </button>

          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-500 hover:text-slate-300 p-1 ml-1 cursor-pointer"
            title="Minimize banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
