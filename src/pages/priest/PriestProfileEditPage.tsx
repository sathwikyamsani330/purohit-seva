import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { priestService } from '../../services/priestService';
import { Priest } from '../../types';
import { Avatar } from '../../components/Avatar';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { CITIES_LIST, TRADITIONS_LIST } from '../../utils';
import {
  User,
  Award,
  BookOpen,
  MapPin,
  Languages,
  CheckCircle,
  Save,
  Flame,
  ShieldCheck
} from 'lucide-react';

export const PriestProfileEditPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { success, error } = useToast();

  const [priest, setPriest] = useState<Priest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    title: '',
    experienceYears: 18,
    tradition: 'Smartha',
    gotra: 'Kashyapa',
    city: 'Bengaluru',
    location: 'Malleswaram',
    languages: 'Sanskrit, Kannada, Telugu, Hindi, English',
    about: '',
    qualifications: 'Veda Brahma from Tirupati Veda Pathashala, Yajurveda Ghanapathi'
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const priestId = currentUser?.id || 'priest-1';
        const data = await priestService.getPriestById(priestId);
        if (data) {
          setPriest(data);
          setFormData({
            name: data.name,
            title: data.title,
            experienceYears: data.experienceYears,
            tradition: data.tradition,
            gotra: data.gotra || '',
            city: data.city,
            location: data.location,
            languages: data.languages.join(', '),
            about: data.about,
            qualifications: data.qualifications?.join(', ') || ''
          });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const priestId = currentUser?.id || 'priest-1';
      await priestService.updatePriestProfile(priestId, {
        name: formData.name,
        title: formData.title,
        experienceYears: Number(formData.experienceYears),
        tradition: formData.tradition,
        gotra: formData.gotra,
        city: formData.city,
        location: formData.location,
        languages: formData.languages.split(',').map((l) => l.trim()),
        about: formData.about,
        qualifications: formData.qualifications.split(',').map((q) => q.trim())
      });
      success('Priest profile updated successfully!');
    } catch {
      error('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading priest profile details..." fullHeight />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
          Acharya Profile & Credentials
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
          Keep your Vedic credentials, tradition, and bio updated for devotees
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Verification Badge */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 text-center shadow-xs">
            <Avatar
              src={priest?.avatarUrl}
              name={formData.name}
              size="2xl"
              className="mx-auto mb-4 ring-4 ring-amber-500/20 shadow-md"
            />
            <h3 className="font-bold text-stone-900 text-lg">{formData.name}</h3>
            <p className="text-xs text-amber-800 font-semibold mt-0.5">{formData.title}</p>
            <p className="text-xs text-stone-400 mt-1">{formData.location}, {formData.city}</p>

            <div className="mt-6 pt-6 border-t border-stone-100 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 py-2 rounded-xl">
              <CheckCircle className="w-4 h-4" />
              <span>Verified Acharya</span>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Edit Form */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />

                <Input
                  label="Honorific Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Rigveda Acharya & Smartha Purohit"
                  required
                />

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1.5">
                    City Base
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full text-xs font-medium bg-white border border-stone-200 rounded-xl px-3 py-2.5 outline-none focus:border-amber-500"
                  >
                    {CITIES_LIST.filter(c => c !== 'All Cities').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Locality / Area"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Malleswaram"
                  required
                />

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1.5">
                    Sampradaya / Tradition
                  </label>
                  <select
                    value={formData.tradition}
                    onChange={(e) => setFormData({ ...formData, tradition: e.target.value })}
                    className="w-full text-xs font-medium bg-white border border-stone-200 rounded-xl px-3 py-2.5 outline-none focus:border-amber-500"
                  >
                    {TRADITIONS_LIST.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Gotra"
                  value={formData.gotra}
                  onChange={(e) => setFormData({ ...formData, gotra: e.target.value })}
                  placeholder="e.g. Kashyapa"
                />

                <Input
                  label="Years of Experience"
                  type="number"
                  value={String(formData.experienceYears)}
                  onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                  required
                />

                <Input
                  label="Languages (comma separated)"
                  value={formData.languages}
                  onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1.5">
                  Veda Pathashala Certifications & Titles (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.qualifications}
                  onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 outline-none focus:border-amber-500"
                  placeholder="e.g. Veda Brahma, Yajurveda Ghanapathi, Agama Praveena"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1.5">
                  Biography & Vedic Lineage / Gurukula Background
                </label>
                <textarea
                  rows={4}
                  value={formData.about}
                  onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 outline-none focus:border-amber-500"
                  placeholder="Describe your lineage, chanting expertise, and approach to guiding families..."
                  required
                />
              </div>

              <div className="pt-3 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  leftIcon={<Save className="w-4 h-4" />}
                  isLoading={saving}
                >
                  Save Profile Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
