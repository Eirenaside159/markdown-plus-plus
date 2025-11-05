import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: 'left' | 'right' | 'top' | 'bottom';
  title?: string;
}

export function Sheet({ isOpen, onClose, children, side = 'right', title }: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sideClasses = {
    left: 'inset-y-0 left-0 w-4/5 max-w-sm lg:w-96',
    right: 'inset-y-0 right-0 w-4/5 max-w-sm lg:w-96',
    top: 'inset-x-0 top-0 h-4/5 max-h-96',
    bottom: 'inset-x-0 bottom-0 h-4/5 max-h-96',
  };

  const animationClasses = {
    left: isOpen ? 'translate-x-0' : '-translate-x-full',
    right: isOpen ? 'translate-x-0' : 'translate-x-full',
    top: isOpen ? 'translate-y-0' : '-translate-y-full',
    bottom: isOpen ? 'translate-y-0' : 'translate-y-full',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`fixed ${sideClasses[side]} z-50 bg-background border-border ${
          side === 'left' ? 'border-r' : side === 'right' ? 'border-l' : side === 'top' ? 'border-b' : 'border-t'
        } shadow-xl transition-transform duration-300 ease-in-out ${animationClasses[side]} flex flex-col`}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-4 border-b shrink-0">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-accent transition-colors touch-target inline-flex items-center justify-center"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </>
  );
}

