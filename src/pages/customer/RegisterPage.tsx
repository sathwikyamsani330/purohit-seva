import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Flame, User, Mail, Phone, Lock } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { registerCustomer, loginWithGoogle } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleChange = (field: string, val: string) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.email || !formData.password) {
      error('Please fill in all required fields');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await registerCustomer({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password
      });
      success('Account registered successfully! Welcome to Purohit Seva.');
      navigate('/home');
    } catch {
      error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle('customer');
      success('Signed up with Google successfully! Welcome to Purohit Seva.');
      navigate('/home');
    } catch (err: any) {
      console.error(err);
      error(err?.message || 'Google sign-up failed');
    } finally {
      setIsGoogleLoading(false);
    }
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
            Create Customer Account
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Book certified priests and manage sacred ceremonies easily
          </p>
        </div>

        {/* Google One-Tap Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignup}
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
          <span>{isGoogleLoading ? 'Connecting to Google...' : 'Sign up with Google'}</span>
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px bg-stone-200 flex-1" />
          <span className="text-xs uppercase text-stone-400 font-medium tracking-wider">or register with email</span>
          <div className="h-px bg-stone-200 flex-1" />
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Input
            label="Full Name"
            placeholder="e.g. Suresh Nair"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            leftIcon={<User className="w-4 h-4" />}
            required
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="+91 98450 00000"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            leftIcon={<Phone className="w-4 h-4" />}
            required
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="Minimum 6 characters"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Re-enter password"
            value={formData.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
            >
              Register & Continue
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-stone-600">
          Already have an account?{' '}
          <Link to="/login" className="text-amber-700 font-bold hover:underline">
            Log In
          </Link>
        </div>

        <div className="mt-4 pt-4 border-t border-stone-100 text-center">
          <p className="text-[11px] text-stone-500">
            Are you a Vedic Priest / Purohit?{' '}
            <Link to="/priest/register" className="text-amber-700 font-bold hover:underline">
              Join as Priest
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
