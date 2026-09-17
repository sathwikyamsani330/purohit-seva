import React, { useState, useEffect } from 'react';
import { protectionService } from '../services/protectionService';
import { PriestTrustBadgeInfo, PriestPolicyAcknowledgement } from '../types';
import { Button } from './Button';
import {
  ShieldCheck,
  Award,
  FileCheck,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Banknote,
  Shield,
  Check
} from 'lucide-react';

interface PriestProtectionPanelProps {
  priestId: string;
  priestName: string;
}

export const PriestProtectionPanel: React.FC<PriestProtectionPanelProps> = ({
  priestId,
  priestName
}) => {
  const [trustBadge, setTrustBadge] = useState<PriestTrustBadgeInfo | null>(null);
  const [acknowledgement, setAcknowledgement] = useState<PriestPolicyAcknowledgement | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  useEffect(() => {
    const loadStatus = async () => {
      setLoading(true);
      try {
        const badge = protectionService.getPriestTrustBadge({ id: priestId });
        const ackData = await protectionService.getPriestPolicyAcknowledgement(priestId);
        setTrustBadge(badge);
        setAcknowledgement(ackData);
      } finally {
        setLoading(false);
      }
    };
    loadStatus();
  }, [priestId]);

  const handleAcknowledge = async () => {
    setIsAcknowledging(true);
    try {
      const ack = await protectionService.acknowledgePriestPolicy(priestId);
      setAcknowledgement(ack);
      setShowPolicyModal(false);
    } finally {
      setIsAcknowledging(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-stone-200 animate-pulse space-y-3">
        <div className="h-5 w-48 bg-stone-200 rounded"></div>
        <div className="h-4 w-72 bg-stone-100 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Priest Platform Benefits & Trust Tier */}
      <div className="bg-white rounded-3xl border border-[#f5ccd2] p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#fdf2f4] text-[#701a28] flex items-center justify-center border border-[#f5ccd2]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-lg font-bold text-stone-900">
                  Acharya Protection & Privileges
                </h3>
                {trustBadge && (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${trustBadge.bgClass} ${trustBadge.colorClass} ${trustBadge.borderClass}`}>
                    <Award className="w-3 h-3 text-[#e5b869]" />
                    {trustBadge.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Official safeguards, instant payouts, and reputation protection for registered Purohits.
              </p>
            </div>
          </div>

          <div>
            {acknowledgement ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
                Fair-Play Agreement Signed
              </span>
            ) : (
              <Button
                variant="gold"
                size="sm"
                onClick={() => setShowPolicyModal(true)}
                leftIcon={<FileCheck className="w-4 h-4" />}
              >
                Review & Sign Fair-Play Policy
              </Button>
            )}
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
          <div className="p-4 rounded-2xl bg-[#faf8f5] border border-[#eadfd9] space-y-2">
            <div className="flex items-center gap-2 text-[#701a28] font-bold text-xs">
              <Banknote className="w-4 h-4 text-[#701a28]" />
              <span>Guaranteed Dakshina Settlement</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Devotees prepay 100% upfront into escrow. Even in late client cancellations, your minimum dakshina compensation is guaranteed.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#faf8f5] border border-[#eadfd9] space-y-2">
            <div className="flex items-center gap-2 text-[#701a28] font-bold text-xs">
              <Sparkles className="w-4 h-4 text-[#e5b869]" />
              <span>Priority Lead Allocation</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Pandits maintaining high on-platform fulfillment receive 3x more bookings for auspicious wedding muhurthams and homams.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#faf8f5] border border-[#eadfd9] space-y-2">
            <div className="flex items-center gap-2 text-[#701a28] font-bold text-xs">
              <Shield className="w-4 h-4 text-[#701a28]" />
              <span>Acharya Council Mediation</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              In case of devotee disputes or venue delays, our dedicated dispute assistance team intervenes to protect your sacred reputation.
            </p>
          </div>
        </div>

        {/* Policy status footer */}
        <div className="mt-5 p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-stone-600">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#701a28] shrink-0" />
            <span>
              <strong>Platform Anti-Bypass Standard:</strong> Conducting bookings outside Purohit Seva forfeits all escrow safety, payment guarantees, and platform mediation.
            </span>
          </div>
          <button
            onClick={() => setShowPolicyModal(true)}
            className="text-[#701a28] hover:underline font-bold text-xs shrink-0 cursor-pointer"
          >
            Read Code of Conduct
          </button>
        </div>
      </div>

      {/* Policy Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#fdf2f4] text-[#701a28] flex items-center justify-center">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-stone-900">
                    Acharya Fair-Play & Conduct Policy
                  </h3>
                  <p className="text-xs text-stone-500">
                    Terms for maintaining Verified Purohit status
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPolicyModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-stone-700 bg-[#faf8f5] p-5 rounded-2xl border border-[#eadfd9] max-h-64 overflow-y-auto">
              <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                1. Dedicated Escrow & Guaranteed Settlements
              </h4>
              <p>
                Purohit Seva collects advance dakshina from devotees to ensure you never face non-payment or cash disputes on the day of the ceremony.
              </p>

              <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] pt-2">
                2. Prohibition of Off-Platform Solicitation
              </h4>
              <p>
                Priests and devotees must not ask, accept, or suggest that scheduled ceremonies or future repeat bookings be conducted off-platform. Off-platform transactions immediately void dispute support, verified reviews, and booking guarantees.
              </p>

              <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] pt-2">
                3. Repeat Booking Loyalty
              </h4>
              <p>
                Devotees who re-book you through Purohit Seva earn Purohit Points and unlock special festival benefits. You receive full dakshina and tier advancements without any client leakage.
              </p>

              <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] pt-2">
                4. Confidential Incident Resolution
              </h4>
              <p>
                If a devotee insists on paying outside or attempts to circumvent policies, Acharyas are encouraged to report it confidentially. Reports are reviewed by human administrators before any action is taken.
              </p>
            </div>

            {acknowledgement ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs">
                <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">Policy Already Acknowledged</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Acknowledged on {new Date(acknowledgement.acknowledgedAt).toLocaleDateString()} (Policy version {acknowledgement.version}).
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => setShowPolicyModal(false)}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleAcknowledge}
                  disabled={isAcknowledging}
                  className="bg-[#701a28] hover:bg-[#59131e]"
                >
                  {isAcknowledging ? 'Confirming...' : 'I Acknowledge & Agree'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

