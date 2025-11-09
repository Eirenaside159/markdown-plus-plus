import { useEffect, useState } from 'react';
import { Eye, Lock, Info } from 'lucide-react';

interface DemoInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoInfoModal({ isOpen, onClose }: DemoInfoModalProps) {
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

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          show ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`bg-background border border-border rounded-lg shadow-2xl w-full max-w-lg transition-all duration-300 ${
            show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-4 p-4 border-b">
            <div className="flex-shrink-0 w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <Eye className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Welcome to Demo Mode</h2>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            <div className="space-y-3 text-sm leading-relaxed">
              <p className="text-foreground">
                You're exploring Markdown++ with sample files. Try the editor, browse posts, and see how everything works.
              </p>
              
              {/* What's Disabled */}
              <div className="bg-warning/10 border border-warning/20 rounded-md p-4 space-y-2">
                <p className="font-semibold text-warning flex items-center gap-2">
                  <Lock className="h-4 w-4 shrink-0" />
                  What's Disabled
                </p>
                <p className="text-foreground">
                  You can't save, create, delete, or publish files in demo mode. It's just for exploring.
                </p>
              </div>

              {/* How to Get Full Access */}
              <div className="bg-primary/5 border border-primary/20 rounded-md p-4 space-y-2">
                <p className="font-semibold text-primary flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0" />
                  Want Full Access?
                </p>
                <p className="text-foreground">
                  Exit demo mode and select a folder from your computer. Then you can edit your own markdown files.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t bg-muted/30">
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

