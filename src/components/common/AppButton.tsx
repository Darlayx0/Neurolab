import React from 'react';
import { ButtonProps } from '../../types';
import { cn } from '../../utils/cn';

export const AppButton: React.FC<ButtonProps> = ({
  id,
  label,
  icon,
  iconPosition = 'none',
  variant = 'primary',
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  ariaLabel,
  className = '',
}) => {
  const baseClasses =
    'relative inline-flex items-center justify-center font-bold transition-all duration-150 rounded-2xl cursor-pointer select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 min-h-[44px] px-6 py-3 text-xs sm:text-sm tracking-wide focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500';

  const variantClasses = {
    primary:
      'bg-slate-900 text-white hover:bg-slate-800 border border-slate-900 shadow-md shadow-slate-900/15 font-black',
    secondary:
      'bg-white text-slate-800 hover:bg-slate-100 hover:text-slate-950 border border-slate-200 shadow-xs font-bold',
    danger:
      'bg-rose-600 text-white hover:bg-rose-500 border border-rose-600/80 shadow-md shadow-rose-600/20 font-bold',
    ghost:
      'bg-transparent text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-semibold',
  };

  const computedAria = ariaLabel || label;

  return (
    <button
      id={id}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={computedAria}
      title={computedAria}
      className={cn(baseClasses, variantClasses[variant], className)}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="font-bold whitespace-nowrap">{label}</span>
        </span>
      ) : (
        <span className="inline-flex items-center justify-center gap-2.5 w-full">
          {icon && (iconPosition === 'leading' || iconPosition === 'only') && (
            <span className="shrink-0 flex items-center justify-center">{icon}</span>
          )}
          {iconPosition !== 'only' && (
            <span className="font-bold whitespace-nowrap truncate">{label}</span>
          )}
          {icon && iconPosition === 'trailing' && (
            <span className="shrink-0 flex items-center justify-center">{icon}</span>
          )}
        </span>
      )}
    </button>
  );
};
