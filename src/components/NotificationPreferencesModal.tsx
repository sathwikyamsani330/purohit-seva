import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Shield,
  CreditCard,
  Flame,
  Gift,
  Smartphone,
  MessageSquare,
  Mail,
  Check,
  Lock,
  Sparkles
} from 'lucide-react';
import { NotificationPreferences } from '../types';
import { notificationService, DEFAULT_PREFERENCES } from '../services/notificationService';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  role?: 'customer' | 'priest' | 'admin';
}

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
  userId = '',
  role = 'customer'
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    ...DEFAULT_PREFERENCES,
    userId
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      notificationService.getPreferences(userId).then((prefs) => {
        setPreferences(prefs);
        setSavedSuccess(false);
      });
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof NotificationPreferences) => {
    // Critical safety protection: transactional notifications cannot be disabled
    if (
      key === 'bookingUpdates' ||
      key === 'paymentAlerts' ||
      key === 'securityAndSafety' ||
      key === 'inApp'
    ) {
      return;
    }

    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleChannelToggle = (channel: 'whatsapp' | 'sms' | 'email') => {
    setPreferences((prev) => ({
      ...prev,
      [channel]: !prev[channel]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await notificationService.savePreferences(preferences);
    setSaving(false);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-[#faf8f5] border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#fdf2f4] text-[#701a28] flex items-center justify-center border border-[#f5ccd2]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                {role === 'priest' ? 'Acharya Notification Settings' : 'Devotee Notification Settings'}
              </h2>
              <p className="text-xs text-stone-500">
                Configure your ceremony alerts, dakshina receipts, and channels
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto text-stone-800">
          {/* Section 1: Critical Transactional Notifications (Locked) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Critical Transactional Alerts
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Lock className="w-3 h-3 text-emerald-600" />
                Required by Policy
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mb-3">
              These vital notifications guarantee escrow security, booking validity, and priest punctuality. They cannot be disabled.
            </p>

            <div className="space-y-2.5">
              {/* Booking Updates */}
              <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900">Booking & Puja Status</p>
                    <p className="text-[10px] text-stone-500">
                      Requests, priest confirmation, on-the-way, and arrival alerts
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-stone-500 bg-stone-200/70 px-2 py-1 rounded-md">
                  Always Active
                </span>
              </div>

              {/* Escrow & Payment Alerts */}
              <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900">100% Escrow & Dakshina Receipts</p>
                    <p className="text-[10px] text-stone-500">
                      Payment links, escrow deposits, and release receipts
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-stone-500 bg-stone-200/70 px-2 py-1 rounded-md">
                  Always Active
                </span>
              </div>

              {/* Security & Support */}
              <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900">Protection & Safety Alerts</p>
                    <p className="text-[10px] text-stone-500">
                      Anti-bypass protection notices and report status updates
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-stone-500 bg-stone-200/70 px-2 py-1 rounded-md">
                  Always Active
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Optional Notifications */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 block mb-1">
              Customizable Alerts & Vedic Updates
            </span>
            <p className="text-[11px] text-stone-500 mb-3">
              Choose non-essential alerts to tailor your spiritual experience.
            </p>

            <div className="space-y-2.5">
              {/* Festival Reminders */}
              <div className="p-3 rounded-2xl border border-stone-200 flex items-center justify-between hover:bg-stone-50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-700 border border-orange-200 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900">General & Festival Updates</p>
                    <p className="text-[10px] text-stone-500">
                      Ekadashi, Amavasya, Navratri, and auspicious tithis
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.generalUpdates}
                    onChange={() => handleToggle('generalUpdates')}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#701a28]"></div>
                </label>
              </div>

              {/* Rewards Updates */}
              <div className="p-3 rounded-2xl border border-stone-200 flex items-center justify-between hover:bg-stone-50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center">
                    <Gift className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900">Vedic Punya & Loyalty Points</p>
                    <p className="text-[10px] text-stone-500">
                      Tier upgrades, points earned, and redemption confirmations
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.rewards}
                    onChange={() => handleToggle('rewards')}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#701a28]"></div>
                </label>
              </div>

              {/* Promotional Offers */}
              <div className="p-3 rounded-2xl border border-stone-200 flex items-center justify-between hover:bg-stone-50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900">Promotions & Seasonal Pujas</p>
                    <p className="text-[10px] text-stone-500">
                      Discounts on samagri kits and special homam packages
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.promotional}
                    onChange={() => handleToggle('promotional')}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#701a28]"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Delivery Channels */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 block mb-1">
              Communication Channels
            </span>
            <p className="text-[11px] text-stone-500 mb-3">
              Where would you like to receive important ceremony alerts?
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* In-App */}
              <div className="p-3 rounded-2xl bg-[#fdf2f4] border border-[#f5ccd2] flex flex-col items-center text-center">
                <Smartphone className="w-4 h-4 text-[#701a28] mb-1.5" />
                <span className="text-xs font-bold text-stone-900">In-App</span>
                <span className="text-[9px] text-[#701a28] font-semibold mt-0.5">Always On</span>
              </div>

              {/* WhatsApp */}
              <button
                type="button"
                onClick={() => handleChannelToggle('whatsapp')}
                className={`p-3 rounded-2xl border transition flex flex-col items-center text-center cursor-pointer ${
                  preferences.whatsapp
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-stone-50 border-stone-200 text-stone-400'
                }`}
              >
                <MessageSquare className="w-4 h-4 mb-1.5 text-emerald-600" />
                <span className="text-xs font-bold">WhatsApp</span>
                <span className="text-[9px] font-semibold mt-0.5">
                  {preferences.whatsapp ? 'Active' : 'Disabled'}
                </span>
              </button>

              {/* SMS */}
              <button
                type="button"
                onClick={() => handleChannelToggle('sms')}
                className={`p-3 rounded-2xl border transition flex flex-col items-center text-center cursor-pointer ${
                  preferences.sms
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-stone-50 border-stone-200 text-stone-400'
                }`}
              >
                <Smartphone className="w-4 h-4 mb-1.5 text-amber-600" />
                <span className="text-xs font-bold">SMS</span>
                <span className="text-[9px] font-semibold mt-0.5">
                  {preferences.sms ? 'Active' : 'Disabled'}
                </span>
              </button>

              {/* Email */}
              <button
                type="button"
                onClick={() => handleChannelToggle('email')}
                className={`p-3 rounded-2xl border transition flex flex-col items-center text-center cursor-pointer ${
                  preferences.email
                    ? 'bg-blue-50 border-blue-300 text-blue-900'
                    : 'bg-stone-50 border-stone-200 text-stone-400'
                }`}
              >
                <Mail className="w-4 h-4 mb-1.5 text-blue-600" />
                <span className="text-xs font-bold">Email</span>
                <span className="text-[9px] font-semibold mt-0.5">
                  {preferences.email ? 'Active' : 'Disabled'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#701a28] hover:bg-[#5a1520] text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Preferences Saved!</span>
              </>
            ) : saving ? (
              <span>Saving...</span>
            ) : (
              <span>Save Preferences</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
