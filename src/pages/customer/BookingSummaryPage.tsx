import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import { useToast } from '../../context/ToastContext';
import { priestService } from '../../services/priestService';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { formatCurrency } from '../../utils';
import { ceremonyPlanService } from '../../services/ceremonyPlanService';
import {
  CheckCircle,
  Star,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  FileText,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Send,
  Sparkles,
  Award,
  AlertCircle
} from 'lucide-react';

export const BookingSummaryPage: React.FC = () => {
  const navigate = useNavigate();
  const { draft, sendRequestFromDraft } = useBooking();
  const { success, error } = useToast();
  const [submitting, setSubmitting] = useState(false);

  if (!draft) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-[#fdf2f4] rounded-full flex items-center justify-center mx-auto text-[#701a28]">
          <Sparkles className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="font-heading text-2xl font-bold text-stone-900">No Request in Progress</h2>
          <p className="text-sm text-stone-600 max-w-md mx-auto">
            You don't have an active priest request draft. Please choose a verified priest and ceremony to get started.
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/priests')}>
          Browse Verified Priests
        </Button>
      </div>
    );
  }

  const formattedAddress = typeof draft.location === 'object' && draft.location !== null
    ? (draft.location.fullAddress || `${draft.location.street || ''}, ${draft.location.area || ''}, ${draft.location.city || ''} ${draft.location.pincode ? `- ${draft.location.pincode}` : ''}`.trim())
    : String(draft.location || 'Ceremony Venue');

  const priestImage = draft.priestImage || draft.priestAvatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2';
  const serviceCharge = draft.serviceCharge || draft.servicePrice || 5000;
  const platformFee = draft.platformFee || 250;
  const totalAmount = draft.totalAmount || (serviceCharge + platformFee);

  const handleBackAndEdit = () => {
    navigate(`/booking/${draft.priestId}`);
  };

  const handleSendRequest = async () => {
    setSubmitting(true);
    try {
      // Re-verify priest slot availability before creating the request
      if (draft.priestId && draft.date && (draft.time || draft.timeSlot)) {
        const slotCheck = await priestService.checkSlotAvailability(
          draft.priestId,
          draft.date,
          draft.time || draft.timeSlot || '',
          draft.eventId
        );

        if (!slotCheck.available) {
          error(slotCheck.reason || 'This slot was recently booked or is no longer available. Please select another slot.');
          setSubmitting(false);
          return;
        }
      }

      const createdRequest = await sendRequestFromDraft();

      if ((draft as any)?.planId && createdRequest?.id) {
        try {
          await ceremonyPlanService.linkBookingToPlan((draft as any).planId, createdRequest.id, 'priest_requested');
        } catch (planErr) {
          console.warn('Failed to link plan to booking request', planErr);
        }
      }

      success('Priest request submitted successfully!');
      navigate(`/request-sent/${createdRequest.id}`);
    } catch (err: any) {
      error(err.message || 'Failed to submit request. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Step Indicator & Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-xs text-stone-500 mb-2">
          <button
            onClick={handleBackAndEdit}
            className="hover:text-[#701a28] flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back & Edit Details
          </button>
          <span>/</span>
          <span className="text-[#701a28] font-semibold">Step 2: Review & Send Request</span>
        </div>

        <span className="text-xs font-bold uppercase tracking-wider text-[#701a28] block mb-1">
          Review Request Details
        </span>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
          Review Puja Request
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
          Review your ritual requirements, auspicious timing, and venue before sending your request to the Acharya.
        </p>
      </div>

      {/* Workflow Info Banner */}
      <div className="p-4 bg-[#fdf2f4] rounded-2xl border border-[#f5ccd2] flex items-start gap-3.5">
        <div className="w-8 h-8 rounded-full bg-[#f5ccd2] text-[#701a28] flex items-center justify-center shrink-0 mt-0.5">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div className="text-xs space-y-1">
          <h4 className="font-bold text-[#59131e]">How the Priest Request Workflow Works</h4>
          <p className="text-[#701a28] leading-relaxed">
            <strong>No payment is required right now.</strong> Your request will be directly sent to Acharya {draft.priestName}. Once the priest confirms availability and accepts your request, you can proceed to payment to finalize the booking.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Detailed Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Priest Details Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-[#701a28]" />
                Selected Purohit / Priest
              </h3>
              <button
                onClick={handleBackAndEdit}
                className="text-xs font-semibold text-[#701a28] hover:text-[#59131e] underline cursor-pointer"
              >
                Change
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Avatar
                src={priestImage}
                name={draft.priestName}
                size="xl"
                className="rounded-2xl shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-heading text-lg font-bold text-stone-900 truncate">
                    {draft.priestName}
                  </h4>
                  {draft.priestIsVerified !== false && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle className="w-3 h-3 text-emerald-600" /> Verified Acharya
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#701a28] font-medium">
                  {draft.priestTitle || 'Vedic Scholar & Ritual Specialist'}
                </p>

                <div className="flex items-center gap-4 text-xs text-stone-600 flex-wrap pt-1">
                  {draft.priestRating && (
                    <span className="flex items-center gap-1 font-semibold text-[#701a28]">
                      <Star className="w-3.5 h-3.5 fill-[#e5b869] text-[#e5b869]" />
                      {draft.priestRating.toFixed(1)}
                      {draft.priestReviewCount ? (
                        <span className="text-stone-400 font-normal">({draft.priestReviewCount} reviews)</span>
                      ) : null}
                    </span>
                  )}
                  {draft.priestExperienceYears && (
                    <span>• <strong>{draft.priestExperienceYears}+ Years</strong> Exp</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Ceremony Specifics Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-stone-900 text-base flex items-center gap-2 border-b border-stone-100 pb-3">
              <Sparkles className="w-4 h-4 text-[#701a28]" />
              Ceremony & Muhurtham Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-[#faf8f5] rounded-xl border border-[#eadfd9] space-y-1">
                <span className="text-stone-500 font-medium block">Requested Puja:</span>
                <p className="text-stone-900 font-bold text-sm">
                  {draft.eventName}
                </p>
                <p className="text-[#701a28] font-semibold text-xs mt-0.5">
                  {draft.serviceName}
                </p>
              </div>

              <div className="p-3.5 bg-[#faf8f5] rounded-xl border border-[#eadfd9] space-y-1">
                <span className="text-stone-500 font-medium block">Auspicious Date & Time:</span>
                <p className="text-stone-900 font-bold text-sm flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#701a28]" />
                  {draft.date}
                </p>
                <p className="text-stone-700 font-semibold text-xs flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-[#701a28]" />
                  Muhurtham: {draft.time || draft.timeSlot}
                </p>
              </div>

              <div className="sm:col-span-2 p-3.5 bg-[#faf8f5] rounded-xl border border-[#eadfd9] space-y-1">
                <span className="text-stone-500 font-medium block flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#701a28]" />
                  Ceremony Location:
                </span>
                <p className="text-stone-900 font-semibold text-xs leading-relaxed">
                  {formattedAddress}
                </p>
              </div>

              {(draft.notes || draft.specialNotes) && (
                <div className="sm:col-span-2 p-3.5 bg-[#faf8f5] rounded-xl border border-[#eadfd9] space-y-1">
                  <span className="text-[#701a28] font-semibold block flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-[#701a28]" />
                    Special Notes & Gotra:
                  </span>
                  <p className="text-stone-700 text-xs italic">
                    "{draft.notes || draft.specialNotes}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Price Breakdown & Send Request CTA */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border border-[#eadfd9] p-6 shadow-md sticky top-24 space-y-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#701a28] block">
                Estimated Dakshina
              </span>
              <h3 className="font-heading text-lg font-bold text-stone-900 mt-0.5">
                Pricing Summary
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center text-stone-600">
                <span>Estimated Dakshina</span>
                <span className="font-bold text-stone-900">{formatCurrency(serviceCharge)}</span>
              </div>

              <div className="flex justify-between items-center text-stone-600">
                <span>Platform Convenience Fee</span>
                <span className="font-bold text-stone-900">{formatCurrency(platformFee)}</span>
              </div>

              <div className="border-t border-stone-200 pt-3 flex justify-between items-center text-base font-bold text-stone-900">
                <span>Payable upon Acceptance</span>
                <span className="text-[#701a28] text-xl font-extrabold">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero Advance Commitment</span>
              </div>
              <p className="text-emerald-700">
                Pay only when the Acharya reviews and accepts your request.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                rightIcon={<Send className="w-4 h-4" />}
                onClick={handleSendRequest}
                isLoading={submitting}
              >
                Send Request
              </Button>

              <Button
                variant="outline"
                size="md"
                fullWidth
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={handleBackAndEdit}
                disabled={submitting}
              >
                Back & Edit Details
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
