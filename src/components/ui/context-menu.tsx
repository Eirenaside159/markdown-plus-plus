import * as React from 'react';
import { cn } from '@/lib/utils';

interface ContextMenuProps {
  children: React.ReactNode;
  menu: React.ReactNode;
  onOpenChange?: (isOpen: boolean) => void;
}

interface ContextMenuContextValue {
  isOpen: boolean;
  position: { x: number; y: number };
  openMenu: (e: React.MouseEvent) => void;
  closeMenu: () => void;
}

const ContextMenuContext = React.createContext<ContextMenuContextValue | undefined>(undefined);

export function ContextMenu({ children, menu, onOpenChange }: ContextMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const menuRef = React.useRef<HTMLDivElement>(null);

  const openMenu = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const x = e.clientX;
    const y = e.clientY;
    
    setPosition({ x, y });
    setIsOpen(true);
    onOpenChange?.(true);
  }, [onOpenChange]);

  const closeMenu = React.useCallback(() => {
    setIsOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  // Close menu when clicking outside
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeMenu]);

  // Adjust menu position to keep it within viewport
  React.useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    // Adjust horizontal position
    if (position.x + menuRect.width > viewportWidth) {
      adjustedX = viewportWidth - menuRect.width - 10;
    }

    // Adjust vertical position
    if (position.y + menuRect.height > viewportHeight) {
      adjustedY = viewportHeight - menuRect.height - 10;
    }

    if (adjustedX !== position.x || adjustedY !== position.y) {
      setPosition({ x: adjustedX, y: adjustedY });
    }
  }, [isOpen, position.x, position.y]);

  return (
    <ContextMenuContext.Provider value={{ isOpen, position, openMenu, closeMenu }}>
      {children}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-50" 
            onClick={closeMenu}
            onContextMenu={(e) => {
              e.preventDefault();
              closeMenu();
            }}
          />
          
          {/* Menu */}
          <div
            ref={menuRef}
            className="fixed z-50 min-w-[12rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
            }}
          >
            {menu}
          </div>
        </>
      )}
    </ContextMenuContext.Provider>
  );
}

export function ContextMenuTrigger({ children }: { children: React.ReactNode }) {
  const context = React.useContext(ContextMenuContext);
  
  if (!context) {
    throw new Error('ContextMenuTrigger must be used within ContextMenu');
  }

  return (
    <div onContextMenu={context.openMenu}>
      {children}
    </div>
  );
}

export function ContextMenuContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('', className)}>{children}</div>;
}

export function ContextMenuItem({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const context = React.useContext(ContextMenuContext);

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
      context?.closeMenu();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus:bg-accent focus:text-accent-foreground',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
    >
      {children}
    </button>
  );
}

export function ContextMenuSeparator() {
  return <div className="my-1 h-px bg-border" />;
}

export function ContextMenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
      {children}
    </div>
  );
}

