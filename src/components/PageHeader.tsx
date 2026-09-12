import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBackToMenu: () => void;
  rightAction?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  onBackToMenu,
  rightAction,
}) => {
  return (
    <header className="w-full border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Left: Back Button & Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToMenu}
            aria-label="Kembali ke Menu Utama"
            title="Kembali ke Menu Utama"
            className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer active:scale-95 shrink-0 shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="hidden sm:block h-5 w-[1px] bg-slate-200" />

          <div className="truncate">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        {rightAction && (
          <div className="flex items-center gap-2.5 shrink-0">
            {rightAction}
          </div>
        )}
      </div>
    </header>
  );
};
