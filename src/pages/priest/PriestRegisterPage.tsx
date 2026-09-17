import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { CITIES_LIST, TRADITIONS_LIST } from '../../utils';
import { Flame, User, Mail, Phone, Lock, Award, BookOpen } from 'lucide-react';

export const PriestRegisterPage: React.FC = () => {
  const { registerPriest } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    title: 'Vedic Scholar & Purohit',
    phone: '',
    email: '',
    password: '',
    city: 'Bengaluru',
    tradition: 'Smartha',
    experienceYears: 10,
    languages: 'Sanskrit, Kannada, Hindi'
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.email || !formData.password) {
      error('Please complete all required fields.');
      return;
    }

    setIsLoading(true);
    try {
      await registerPriest({
        name: formData.name,
        title: formData.title,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        tradition: formData.tradition,
        experienceYears: Number(formData.experienceYears),
        languages: formData.languages.split(',').map((l) => l.trim()),
        password: formData.password
      });
      success('Priest profile registered! Welcome to the Purohit Seva Acharya Network.');
      navigate('/priest/dashboard');
    } catch {
      error('Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-stone-900 text-stone-100">
      <div className="w-full max-w-lg bg-stone-950 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Top Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-amber-600/30">
            <Flame className="w-8 h-8 fill-amber-200" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 block mb-1">
            Join the Acharya Network
          </span>
          <h2 className="font-heading text-2xl font-bold text-white">
            Register as a Vedic Priest
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Connect with devout families, schedule pujas, and receive direct dakshina
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Input
            label="Full Name (e.g. Pandit / Acharya...)"
            placeholder="e.g. Pandit Raghavendra Sharma"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Contact Phone Number"
              placeholder="+91 98450 00000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="acharya@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                City Base
              </label>
              <select
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full text-xs font-medium bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-stone-200 outline-none focus:border-amber-500"
              >
                {CITIES_LIST.filter(c => c !== 'All Cities').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                Tradition / Sampradaya
              </label>
              <select
                value={formData.tradition}
                onChange={(e) => setFormData({ ...formData, tradition: e.target.value })}
                className="w-full text-xs font-medium bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-stone-200 outline-none focus:border-amber-500"
              >
                {TRADITIONS_LIST.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <Input
              label="Years of Experience"
              type="number"
              value={String(formData.experienceYears)}
              onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
              required
            />
          </div>

          <Input
            label="Spoken Languages (comma separated)"
            value={formData.languages}
            onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
            placeholder="Sanskrit, Kannada, Hindi, Telugu"
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="Minimum 6 characters"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />

          <div className="pt-3">
            <Button
              type="submit"
              variant="gold"
              size="lg"
              fullWidth
              isLoading={isLoading}
            >
              Complete Acharya Registration
            </Button>
          </div>
        </form>

        <div className="text-center text-xs text-stone-400">
          Already registered?{' '}
          <Link to="/priest/login" className="text-amber-400 font-bold hover:underline">
            Priest Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
