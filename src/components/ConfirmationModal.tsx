import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  isLoading = false
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <div className="flex flex-col items-center text-center p-2">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
          type === 'danger' ? 'bg-rose-100 text-rose-600' :
          type === 'success' ? 'bg-emerald-100 text-emerald-600' :
          type === 'info' ? 'bg-blue-100 text-blue-600' :
          'bg-amber-100 text-amber-600'
        }`}>
          {type === 'danger' && <AlertTriangle className="w-6 h-6" />}
          {type === 'success' && <CheckCircle2 className="w-6 h-6" />}
          {type === 'info' && <Info className="w-6 h-6" />}
          {type === 'warning' && <AlertTriangle className="w-6 h-6" />}
        </div>

        <h3 className="text-lg font-bold text-stone-900 mb-2">{title}</h3>
        <p className="text-sm text-stone-600 mb-6">{message}</p>

        <div className="flex gap-3 w-full">
          <Button
            variant="outline"
            fullWidth
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={type === 'danger' ? 'danger' : 'primary'}
            fullWidth
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
