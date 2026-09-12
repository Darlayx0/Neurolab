import React from 'react';
import { AppButton } from './AppButton';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  onConfirm,
  onCancel,
  danger = true,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl select-none text-slate-900">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              {title}
            </h3>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <AppButton
            id="dialog-cancel-button"
            label={cancelLabel}
            variant="secondary"
            onClick={onCancel}
            className="text-xs px-5 py-2 min-h-[40px] rounded-2xl"
          />
          <AppButton
            id="dialog-confirm-button"
            label={confirmLabel}
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            className="text-xs px-5 py-2 min-h-[40px] rounded-2xl"
          />
        </div>
      </div>
    </div>
  );
};
