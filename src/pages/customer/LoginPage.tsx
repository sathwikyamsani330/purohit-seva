import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Flame, Mail, Lock, ShieldAlert, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginCustomer, loginWithGoogle, currentUser } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/home';
  const unauthorizedNotice = (location.state as any)?.reason || ((location.state as any)?.unauthorized ? 'Please sign in to access your bookings and profile.' : null);

  useEffect(() => {
    if (currentUser?.role === 'customer') {
      navigate(from, { replace: true });
    }
  }, [currentUser, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      error('Please enter your email address');
      return;
    }
    setIsLoading(true);
    try {
      await loginCustomer(email, password);
      success('Logged in successfully! Welcome back.');
      navigate(from, { replace: true });
    } catch {
      error('Invalid login credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle('customer');
      success('Signed in with Google successfully!');
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error(err);
      error(err?.message || 'Google sign-in was cancelled or failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleFillDemoCustomer = () => {
    setEmail('suresh.nair@example.com');
    setPassword('customer123');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl border border-stone-200/90 shadow-xl p-6 sm:p-8">
        {/* Top Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-600 flex items-center justify-center text-white mx-auto mb-3 shadow-md shadow-amber-600/20">
            <Flame className="w-7 h-7 fill-amber-200" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-stone-900">
            Customer Login
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Access your bookings and discover verified acharyas
          </p>
        </div>

        {unauthorizedNotice && (
          <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold text-amber-950">Authentication Required</strong>
              <span>{unauthorizedNotice}</span>
            </div>
          </div>
        )}

        {/* Google One-Tap Sign In */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-sm transition shadow-sm mb-5 cursor-pointer disabled:opacity-60"
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
          <div className="h-px bg-stone-200 flex-1" />
          <span className="text-xs uppercase text-stone-400 font-medium tracking-wider">or with email</span>
          <div className="h-px bg-stone-200 flex-1" />
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-stone-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <span>Remember me</span>
            </label>

            <button
              type="button"
              onClick={() => success('Password reset link sent to your registered email')}
              className="text-amber-700 hover:text-amber-800 font-semibold cursor-pointer"
            >
              Forgot password?
            </button>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
            >
              Log In
            </Button>
          </div>
        </form>

        <div className="mt-4 pt-3 border-t border-stone-200 text-center">
          <button
            type="button"
            onClick={handleFillDemoCustomer}
            className="inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800 font-medium cursor-pointer transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Use Demo Customer (suresh.nair@example.com)</span>
          </button>
        </div>

        {/* Create Account Link */}
        <div className="mt-6 text-center text-xs text-stone-600">
          Don’t have an account yet?{' '}
          <Link to="/register" className="text-amber-700 font-bold hover:underline">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
};
