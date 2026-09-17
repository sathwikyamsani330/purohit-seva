import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Avatar } from '../../components/Avatar';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { CITIES_LIST } from '../../utils';
import { notificationService } from '../../services/notificationService';
import { NotificationPreferences } from '../../types';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Bell,
  Lock,
  LogOut,
  Save,
  CheckCircle2,
  Sparkles,
  Gift
} from 'lucide-react';

export const CustomerProfilePage: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { success } = useToast();

  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [city, setCity] = useState(currentUser?.city || '');
  const [gotra, setGotra] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Notification preferences state
  const [pref, setPref] = useState<NotificationPreferences>({
    userId: currentUser?.id || '',
    bookingUpdates: true,
    paymentAlerts: true,
    securityAndSafety: true,
    generalUpdates: true,
    rewards: true,
    promotional: true,
    inApp: true,
    email: true,
    sms: true,
    whatsapp: true,
    updatedAt: new Date().toISOString()
  });

  React.useEffect(() => {
    if (currentUser?.id) {
      notificationService.getPreferences(currentUser.id).then(setPref);
    }
  }, [currentUser]);

  const handleTogglePref = async (key: keyof NotificationPreferences) => {
    if (
      key === 'bookingUpdates' ||
      key === 'paymentAlerts' ||
      key === 'securityAndSafety' ||
      key === 'inApp'
    ) {
      return;
    }
    const updated = {
      ...pref,
      [key]: !pref[key]
    };
    setPref(updated);
    await notificationService.savePreferences(updated);
    success('Notification preference updated.');
  };

  const handleToggleChannel = async (channel: 'whatsapp' | 'sms' | 'email') => {
    const updated = {
      ...pref,
      [channel]: !pref[channel]
    };
    setPref(updated);
    await notificationService.savePreferences(updated);
    success('Channel setting updated.');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      success('Profile details updated successfully!');
    }, 600);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    success('Password updated successfully!');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
            Account Profile & Preferences
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Manage your personal devotee information, address, and alerts
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="text-rose-600 border-rose-200 hover:bg-rose-50 self-start sm:self-auto"
          onClick={logout}
          leftIcon={<LogOut className="w-4 h-4" />}
        >
          Log Out
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Summary */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200/90 p-6 text-center shadow-xs">
            <Avatar
              src={currentUser?.avatarUrl}
              name={name}
              size="2xl"
              className="mx-auto mb-4 ring-4 ring-amber-500/20"
            />
            <h3 className="font-bold text-stone-900 text-lg">{name}</h3>
            <p className="text-xs text-amber-800 font-semibold mt-0.5">Devotee Member</p>
            <p className="text-xs text-stone-400 mt-1">{city}, India</p>

            <div className="mt-6 pt-6 border-t border-stone-100 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 py-2 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
              <span>Verified Account</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 text-xs text-amber-950 space-y-2">
            <h4 className="font-bold uppercase tracking-wider text-[10px] text-amber-800">
              Purohit Seva Rewards
            </h4>
            <p className="text-xs leading-relaxed">
              You have completed <strong>3 sacred ceremonies</strong> with us. Your auspicious booking priority is active.
            </p>
          </div>
        </div>

        {/* Right 2 Columns: Edit Details & Settings */}
        <div className="md:col-span-2 space-y-8">
          {/* Personal Information Form */}
          <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs">
            <h3 className="font-bold text-stone-900 text-base mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-amber-600" />
              Personal & Sankalpam Information
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  leftIcon={<User className="w-4 h-4" />}
                  required
                />

                <Input
                  label="Primary Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  leftIcon={<Phone className="w-4 h-4" />}
                  required
                />

                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                  required
                />

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    City
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 outline-none focus:border-amber-500"
                  >
                    {CITIES_LIST.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <Input
                    label="Family Gotra & Sampradaya Preference"
                    value={gotra}
                    onChange={(e) => setGotra(e.target.value)}
                    helperText="Helps acharyas prepare proper sankalpam slokas in advance"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  leftIcon={<Save className="w-4 h-4" />}
                  isLoading={isSaving}
                >
                  Save Profile Changes
                </Button>
              </div>
            </form>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600" />
                Notification Preferences & Channels
              </h3>
              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-600" />
                100% Protected Escrow Alerts
              </span>
            </div>

            <p className="text-xs text-stone-500 mb-4">
              Real-time push notifications and channel preferences for puja muhurthams, acharya journey tracking, and rewards.
            </p>

            <div className="space-y-3">
              {/* Critical Notice */}
              <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-2xl flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-900 leading-relaxed">
                  <strong>Critical Security & Booking Alerts:</strong> Booking confirmations, payment receipts, priest arrival notices, and escrow security alerts are permanently active for devotee safety.
                </div>
              </div>

              {/* Festival Alerts */}
              <label className="flex items-center justify-between p-3.5 bg-stone-50 hover:bg-stone-100/70 border border-stone-200/70 rounded-2xl cursor-pointer transition">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-900 block">Festival & Auspicious Muhurtham Alerts</span>
                    <span className="text-[11px] text-stone-500">Panchang reminders for Ekadashi, Sankranti, and auspicious tithis</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={pref.generalUpdates}
                  onChange={() => handleTogglePref('generalUpdates')}
                  className="rounded text-[#701a28] focus:ring-[#701a28] accent-[#701a28] cursor-pointer w-4 h-4"
                />
              </label>

              {/* Rewards Alerts */}
              <label className="flex items-center justify-between p-3.5 bg-stone-50 hover:bg-stone-100/70 border border-stone-200/70 rounded-2xl cursor-pointer transition">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Gift className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-900 block">Vedic Punya & Loyalty Points Updates</span>
                    <span className="text-[11px] text-stone-500">Earned points notifications and special tier rewards</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={pref.rewards}
                  onChange={() => handleTogglePref('rewards')}
                  className="rounded text-[#701a28] focus:ring-[#701a28] accent-[#701a28] cursor-pointer w-4 h-4"
                />
              </label>

              {/* Promotional Offers */}
              <label className="flex items-center justify-between p-3.5 bg-stone-50 hover:bg-stone-100/70 border border-stone-200/70 rounded-2xl cursor-pointer transition">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-900 block">Ceremony Offers & Seasonal Pujas</span>
                    <span className="text-[11px] text-stone-500">Special homam samagri discounts and community announcements</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={pref.promotional}
                  onChange={() => handleTogglePref('promotional')}
                  className="rounded text-[#701a28] focus:ring-[#701a28] accent-[#701a28] cursor-pointer w-4 h-4"
                />
              </label>

              {/* Channel Selectors */}
              <div className="pt-2">
                <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block mb-2">
                  Delivery Channels
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-xl bg-stone-100 border border-stone-200 text-center">
                    <span className="text-xs font-bold text-stone-900 block">In-App</span>
                    <span className="text-[10px] text-emerald-700 font-semibold">Always Active</span>
                  </div>

                  <label className={`p-2.5 rounded-xl border text-center cursor-pointer transition ${
                    pref.whatsapp ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-stone-50 border-stone-200 text-stone-400'
                  }`}>
                    <input
                      type="checkbox"
                      checked={pref.whatsapp}
                      onChange={() => handleToggleChannel('whatsapp')}
                      className="sr-only"
                    />
                    <span className="text-xs font-bold block">WhatsApp</span>
                    <span className="text-[10px] font-semibold">{pref.whatsapp ? 'Enabled' : 'Off'}</span>
                  </label>

                  <label className={`p-2.5 rounded-xl border text-center cursor-pointer transition ${
                    pref.sms ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-stone-50 border-stone-200 text-stone-400'
                  }`}>
                    <input
                      type="checkbox"
                      checked={pref.sms}
                      onChange={() => handleToggleChannel('sms')}
                      className="sr-only"
                    />
                    <span className="text-xs font-bold block">SMS</span>
                    <span className="text-[10px] font-semibold">{pref.sms ? 'Enabled' : 'Off'}</span>
                  </label>

                  <label className={`p-2.5 rounded-xl border text-center cursor-pointer transition ${
                    pref.email ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-stone-50 border-stone-200 text-stone-400'
                  }`}>
                    <input
                      type="checkbox"
                      checked={pref.email}
                      onChange={() => handleToggleChannel('email')}
                      className="sr-only"
                    />
                    <span className="text-xs font-bold block">Email</span>
                    <span className="text-[10px] font-semibold">{pref.email ? 'Enabled' : 'Off'}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Security / Password Section */}
          <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs">
            <h3 className="font-bold text-stone-900 text-base mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" />
              Security & Password
            </h3>

            <form onSubmit={handlePasswordChange} className="space-y-3.5">
              <Input
                label="Current Password"
                type="password"
                placeholder="••••••••"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="New Password"
                  type="password"
                  placeholder="New password"
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Confirm password"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button variant="outline" size="sm" type="submit">
                  Update Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
