import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Send,
  HelpCircle
} from 'lucide-react';
import {
  protectionService,
  REPORT_CATEGORIES
} from '../services/protectionService';
import { ReportCategory } from '../types';

export interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
  requestId?: string;
  reporterId: string;
  reporterName?: string;
  reporterEmail?: string;
  reportedUserId: string;
  reportedUserName?: string;
  reporterRole: 'customer' | 'priest';
  onSuccess?: () => void;
}

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  requestId,
  reporterId,
  reporterName,
  reporterEmail,
  reportedUserId,
  reportedUserName,
  reporterRole,
  onSuccess
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>(
    reporterRole === 'customer'
      ? 'PRIEST_ASKED_DIRECT_PAY'
      : 'CUSTOMER_PROPOSED_OFF_PLATFORM'
  );
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);

  const availableCategories = REPORT_CATEGORIES.filter(
    (cat) => cat.role === reporterRole || cat.role === 'both'
  );

  const handleReset = () => {
    setDescription('');
    setErrorMessage(null);
    setSubmittedReportId(null);
    setSelectedCategory(
      reporterRole === 'customer'
        ? 'PRIEST_ASKED_DIRECT_PAY'
        : 'CUSTOMER_PROPOSED_OFF_PLATFORM'
    );
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMessage('Please provide a brief description of what happened.');
      return;
    }
    if (description.trim().length < 10) {
      setErrorMessage('Please describe the incident in at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const report = await protectionService.createReport({
        bookingId,
        requestId,
        reporterId,
        reporterName,
        reporterEmail,
        reportedUserId,
        reportedUserName,
        reporterRole,
        category: selectedCategory,
        description: description.trim()
      });

      setSubmittedReportId(report.id);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Report an Issue or Policy Concern"
      subtitle="Confidential review by the Purohit Seva Acharya Council"
      maxWidth="lg"
    >
      {submittedReportId ? (
        <div className="py-4 text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="font-heading text-lg font-bold text-stone-900">
              Report Submitted Successfully
            </h3>
            <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
              Your reference ID is <strong className="font-mono text-[#701a28]">{submittedReportId}</strong>.
              Our integrity team will investigate discreetly. Thank you for protecting the authenticity and sanctity of our Vedic community.
            </p>
          </div>

          <div className="p-3.5 bg-[#faf8f5] border border-[#eadfd9] rounded-2xl text-left text-xs text-stone-600 space-y-1.5 max-w-md mx-auto">
            <div className="flex items-center gap-1.5 font-bold text-stone-800">
              <Lock className="w-3.5 h-3.5 text-[#701a28]" />
              Strict Confidentiality Guarantee
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Neither the reported party nor external parties are informed of your identity. You will receive an in-app notification when the review status is updated.
            </p>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleClose}
              className="bg-[#701a28] hover:bg-[#59131e] text-white px-6 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Safety Notice Banner */}
          <div className="p-3.5 bg-[#fdf2f4] border border-[#f5ccd2] rounded-2xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#701a28] shrink-0 mt-0.5" />
            <div className="text-xs text-stone-700 space-y-0.5">
              <p className="font-bold text-[#701a28]">
                Protected Platform Policy
              </p>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                For your security, bookings and dakshina are fully protected only when conducted through Purohit Seva. Off-platform requests violate our code of conduct.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Context Details */}
          {(reportedUserName || bookingId) && (
            <div className="grid grid-cols-2 gap-2 text-xs bg-[#faf8f5] p-3 rounded-xl border border-[#eadfd9]">
              {reportedUserName && (
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">
                    {reporterRole === 'customer' ? 'Officiating Priest' : 'Customer'}
                  </span>
                  <span className="font-semibold text-stone-800">{reportedUserName}</span>
                </div>
              )}
              {bookingId && (
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">
                    Booking Reference
                  </span>
                  <span className="font-mono font-semibold text-[#701a28]">{bookingId}</span>
                </div>
              )}
            </div>
          )}

          {/* Category Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-800 block">
              What type of issue occurred?
            </label>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {availableCategories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <label
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`block p-3 rounded-xl border cursor-pointer transition text-left ${
                      isSelected
                        ? 'border-[#701a28] bg-[#fdf2f4] shadow-xs'
                        : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <p className={`text-xs font-bold ${isSelected ? 'text-[#701a28]' : 'text-stone-800'}`}>
                          {cat.label}
                        </p>
                        <p className="text-[11px] text-stone-500 leading-relaxed">
                          {cat.description}
                        </p>
                      </div>
                      <input
                        type="radio"
                        name="reportCategory"
                        value={cat.id}
                        checked={isSelected}
                        onChange={() => setSelectedCategory(cat.id)}
                        className="mt-0.5 accent-[#701a28]"
                      />
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Description Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-800 flex items-center justify-between">
              <span>Incident Details & Evidence</span>
              <span className="text-[10px] font-normal text-stone-400">
                Min 10 characters
              </span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe specifically what was requested, communicated, or observed (e.g. asked for cash, direct WhatsApp payment, or discounted private ceremony)..."
              className="w-full text-xs bg-white border border-stone-200 rounded-xl p-3 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#701a28] transition"
            />
          </div>

          {/* Confidentiality Footer */}
          <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
            <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span>Strictly confidential. Never shared with the reported party.</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isSubmitting}
              className="border-stone-200 text-stone-700 hover:bg-stone-50 text-xs px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !description.trim()}
              className="bg-[#701a28] hover:bg-[#59131e] text-white text-xs px-4 font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? (
                <>Submitting...</>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Submit Report
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
