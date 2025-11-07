import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  isOpen: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({ 
  message, 
  type = 'info', 
  isOpen, 
  onClose, 
  duration = 4000 
}: ToastProps) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-success',
      borderColor: 'border-success',
      textColor: 'text-success-foreground',
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-destructive',
      borderColor: 'border-destructive',
      textColor: 'text-destructive-foreground',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-warning',
      borderColor: 'border-warning',
      textColor: 'text-warning-foreground',
    },
    info: {
      icon: Info,
      bgColor: 'bg-info',
      borderColor: 'border-info',
      textColor: 'text-info-foreground',
    },
  };

  const { icon: Icon, bgColor, borderColor, textColor } = config[type];

  return (
    <div 
      className="fixed bottom-4 right-4 z-[100] w-[calc(100%-2rem)] sm:w-auto max-w-md animate-in slide-in-from-bottom-2 duration-300"
      role="alert"
      aria-live="assertive"
    >
      <div 
        className={`${bgColor} ${textColor} rounded-lg shadow-lg border ${borderColor} p-2.5 sm:p-3 flex items-center gap-2`}
      >
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
        <p className="flex-1 text-xs sm:text-sm font-medium leading-tight break-words">
          {message}
        </p>
        <button
          onClick={onClose}
          className="shrink-0 p-1 hover:bg-white/20 active:bg-white/30 rounded transition-colors inline-flex items-center justify-center"
          aria-label="Close notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// Hook for easier toast usage
export function useToast() {
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
  }>({
    isOpen: false,
    message: '',
    type: 'info',
    duration: 4000,
  });

  const showToast = (
    message: string, 
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    duration?: number
  ) => {
    setToast({ isOpen: true, message, type, duration });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isOpen: false }));
  };

  return { toast, showToast, hideToast };
}

