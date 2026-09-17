import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { ShieldCheck, Mail, Lock, ShieldAlert, Sparkles } from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const { loginAdmin, currentUser } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/admin/dashboard';
  const unauthorizedNotice = (location.state as any)?.reason || ((location.state as any)?.unauthorized ? 'Admin authorization required to access that page.' : null);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      navigate(from, { replace: true });
    }
  }, [currentUser, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await loginAdmin(email, password);
      success('Logged in to Master Admin Console.');
      navigate(from, { replace: true });
    } catch (err: any) {
      error(err?.message || 'Invalid admin credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemoAdmin = () => {
    setEmail('admin@purohitseva.in');
    setPassword('admin123');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-stone-950 text-stone-100">
      <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 block mb-1">
            Central Management System
          </span>
          <h2 className="font-heading text-2xl font-bold text-white">
            Admin Master Console
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Platform governance, verification approvals, and booking analytics
          </p>
        </div>

        {unauthorizedNotice && (
          <div className="p-3.5 bg-red-950/60 border border-red-800/80 rounded-2xl text-xs text-red-200 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold text-red-300">Access Restricted</strong>
              <span>{unauthorizedNotice}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Super Admin Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            placeholder="admin@purohitseva.in"
            required
            className="bg-stone-950 border-stone-800 text-white"
          />

          <Input
            label="Security Passkey"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            placeholder="••••••••"
            required
            className="bg-stone-950 border-stone-800 text-white"
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
            >
              Enter Admin Console
            </Button>
          </div>
        </form>

        <div className="pt-2 border-t border-stone-800/80 text-center">
          <button
            type="button"
            onClick={handleFillDemoAdmin}
            className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Use Demo Admin Credentials (admin@purohitseva.in)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
