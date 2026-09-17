import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { RejectionReason } from '../types';
import { AlertTriangle, X } from 'lucide-react';

export interface RejectRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReject: (reason: RejectionReason | string, notes?: string) => Promise<void>;
  requestTitle?: string;
  customerName?: string;
  date?: string;
  time?: string;
  isLoading?: boolean;
}

const REJECTION_OPTIONS: { reason: RejectionReason; label: string; description: string }[] = [
  {
    reason: 'Already booked',
    label: 'Already Booked',
    description: 'You have a conflicting sacred commitment or prior booking at this time'
  },
  {
    reason: 'Not available',
    label: 'Not Available',
    description: 'Personal unavailability, pilgrimage, or resting day'
  },
  {
    reason: 'Location too far',
    label: 'Location Too Far',
    description: 'Ceremony venue is beyond your daily travel radius'
  },
  {
    reason: 'Timing unavailable',
    label: 'Timing Unavailable',
    description: 'Muhurtham time clashes with daily Nitya Puja or temple rituals'
  },
  {
    reason: 'Other',
    label: 'Other Reason',
    description: 'Specific custom reason or temple requirement'
  }
];

export const RejectRequestModal: React.FC<RejectRequestModalProps> = ({
  isOpen,
  onClose,
  onConfirmReject,
  requestTitle,
  customerName,
  date,
  time,
  isLoading = false
}) => {
  const [selectedReason, setSelectedReason] = useState<RejectionReason>('Already booked');
  const [customNotes, setCustomNotes] = useState('');

  const handleConfirm = async () => {
    await onConfirmReject(selectedReason, customNotes.trim() || undefined);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-lg font-bold text-slate-900">
              Decline Puja Request
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {requestTitle ? `For ${requestTitle}` : 'Reject ceremony request'}
              {customerName ? ` from ${customerName}` : ''}
              {date ? ` on ${date} (${time})` : ''}
            </p>
          </div>
        </div>

        {/* Reason Selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 block">
            Please select reason for unavailability (optional explanation sent to client):
          </label>
          <div className="space-y-2">
            {REJECTION_OPTIONS.map((opt) => (
              <label
                key={opt.reason}
                className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                  selectedReason === opt.reason
                    ? 'border-rose-300 bg-rose-50/50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="rejectionReason"
                  checked={selectedReason === opt.reason}
                  onChange={() => setSelectedReason(opt.reason)}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-slate-900 block">{opt.label}</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">{opt.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Optional Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">
            Additional note or alternative suggestion (optional):
          </label>
          <textarea
            rows={2}
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            placeholder="e.g., Available on the next day or afternoon slot..."
            className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none bg-slate-50"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            Confirm & Decline Request
          </Button>
        </div>
      </div>
    </Modal>
  );
};
