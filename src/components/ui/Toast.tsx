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
      bgColor: 'bg-green-500 dark:bg-green-600',
      borderColor: 'border-green-600 dark:border-green-500',
      textColor: 'text-white',
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-red-500 dark:bg-red-600',
      borderColor: 'border-red-600 dark:border-red-500',
      textColor: 'text-white',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-500 dark:bg-yellow-600',
      borderColor: 'border-yellow-600 dark:border-yellow-500',
      textColor: 'text-white',
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-500 dark:bg-blue-600',
      borderColor: 'border-blue-600 dark:border-blue-500',
      textColor: 'text-white',
    },
  };

  const { icon: Icon, bgColor, borderColor, textColor } = config[type];

  return (
    <div 
      className="fixed bottom-4 right-4 z-[100] w-[calc(100%-2rem)] sm:w-auto max-w-lg animate-in slide-in-from-bottom-2 duration-300"
      role="alert"
      aria-live="assertive"
    >
      <div 
        className={`${bgColor} ${textColor} rounded-xl shadow-2xl border ${borderColor} p-3.5 sm:p-4 flex items-center gap-3`}
      >
        <Icon className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
        <p className="flex-1 text-sm sm:text-base font-medium leading-snug break-words">
          {message}
        </p>
        <button
          onClick={onClose}
          className="shrink-0 p-1.5 hover:bg-white/20 active:bg-white/30 rounded-md transition-colors touch-target inline-flex items-center justify-center"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
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

