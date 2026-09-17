import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Flame, Mail, Lock, ShieldAlert, Sparkles } from 'lucide-react';

export const PriestLoginPage: React.FC = () => {
  const { loginPriest, loginWithGoogle, currentUser } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/priest/dashboard';
  const unauthorizedNotice = (location.state as any)?.reason || ((location.state as any)?.unauthorized ? 'Priest credentials required to access the Acharya Portal.' : null);

  useEffect(() => {
    if (currentUser?.role === 'priest') {
      navigate(from, { replace: true });
    }
  }, [currentUser, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await loginPriest(email, password);
      success('Welcome back, Pandit ji!');
      navigate(from, { replace: true });
    } catch {
      error('Invalid priest login credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle('priest');
      success('Signed in with Google as Priest!');
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error(err);
      error(err?.message || 'Google sign-in was cancelled or failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleFillDemoPriest = () => {
    setEmail('raghavendra.sharma@purohitseva.in');
    setPassword('priest123');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-stone-900 text-stone-100">
      <div className="w-full max-w-md bg-stone-950 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Top Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-amber-600/30">
            <Flame className="w-8 h-8 fill-amber-200" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 block mb-1">
            Acharya Seva Kendra
          </span>
          <h2 className="font-heading text-2xl font-bold text-white">
            Purohit Portal Login
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Manage your daily pujas, accept bookings, and track dakshina
          </p>
        </div>

        {unauthorizedNotice && (
          <div className="mb-5 p-3.5 bg-amber-950/60 border border-amber-800/80 rounded-2xl text-xs text-amber-200 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold text-amber-300">Acharya Access Required</strong>
              <span>{unauthorizedNotice}</span>
            </div>
          </div>
        )}

        {/* Google Sign In for Priest */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-stone-700 hover:border-amber-500/50 bg-stone-900 hover:bg-stone-800 text-stone-200 font-semibold text-sm transition shadow-sm mb-5 cursor-pointer disabled:opacity-60"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px bg-stone-800 flex-1" />
          <span className="text-[11px] uppercase text-stone-500 font-medium tracking-wider">or sign in with credentials</span>
          <div className="h-px bg-stone-800 flex-1" />
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Priest Email / ID"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
            className="bg-stone-900 border-stone-800 text-white"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            required
            className="bg-stone-900 border-stone-800 text-white"
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="gold"
              size="lg"
              fullWidth
              isLoading={isLoading}
            >
              Sign In to Priest Portal
            </Button>
          </div>
        </form>

        <div className="mt-4 pt-3 border-t border-stone-800 text-center">
          <button
            type="button"
            onClick={handleFillDemoPriest}
            className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Use Demo Acharya (raghavendra.sharma@purohitseva.in)</span>
          </button>
        </div>

        <div className="mt-4 text-center text-xs text-stone-400">
          New Purohit / Acharya?{' '}
          <Link to="/priest/register" className="text-amber-400 font-bold hover:underline">
            Register as a Priest
          </Link>
        </div>

        <div className="mt-6 pt-4 border-t border-stone-800 text-center">
          <Link to="/login" className="text-xs text-stone-500 hover:text-stone-300">
            ← Switch to Customer Login
          </Link>
        </div>
      </div>
    </div>
  );
};
