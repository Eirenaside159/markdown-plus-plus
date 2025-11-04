import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

const STORAGE_KEY = 'markdown-plus-plus-warning-accepted';

interface WelcomeWarningModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export function WelcomeWarningModal({ isOpen, onAccept }: WelcomeWarningModalProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Small delay for animation
      const timer = setTimeout(() => setShow(true), 50);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onAccept();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 ${
          show ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`bg-background border border-border rounded-lg shadow-2xl w-full max-w-lg transition-all duration-300 ${
            show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          {/* Header */}
          <div className="flex items-center gap-4 p-6 border-b">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">Disclaimer</h2>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="space-y-3 text-sm leading-relaxed">
              <p className="text-foreground">
                <strong>Markdown++</strong> is a new project and is actively under development.
              </p>
              
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-4 space-y-2">
                <p className="font-semibold text-yellow-700 dark:text-yellow-500">
                  ⚠️ Please be aware:
                </p>
                <ul className="space-y-1.5 text-yellow-800 dark:text-yellow-400 pl-4 list-disc">
                  <li>This application is in beta stage</li>
                  <li>Unexpected errors may occur</li>
                  <li>Data loss in your files is possible</li>
                </ul>
              </div>

              <p className="text-foreground font-medium">
                Before you start using, <span className="text-red-500">make sure to backup all your files!</span>
              </p>

              <p className="text-muted-foreground text-xs">
                By using this application, you accept responsibility for potential data loss.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-muted/30">
            <button
              onClick={handleAccept}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Okay
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function shouldShowWarning(): boolean {
  return !localStorage.getItem(STORAGE_KEY);
}

