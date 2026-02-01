'use client';

import * as React from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';

type CommandAction = {
  id: string;
  name: string;
  keywords?: string;
  section: string;
  icon: string;
  href?: string;
  perform?: () => void;
};

type CommandPaletteContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  openPalette: () => void;
  closePalette: () => void;
};

const CommandPaletteContext = React.createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette() {
  const ctx = React.useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  }
  return ctx;
}

interface CommandPaletteProviderProps {
  children: React.ReactNode;
}

export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
  const [open, setOpen] = React.useState(false);

  const openPalette = React.useCallback(() => setOpen(true), []);
  const closePalette = React.useCallback(() => setOpen(false), []);

  // Global keyboard shortcut: Cmd/Ctrl + K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  // Global keyboard shortcut: "/" key (when not in input)
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (open) return;
      if (e.key !== '/') return;

      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        target.isContentEditable ||
        tag === 'SELECT'
      ) {
        return;
      }

      e.preventDefault();
      setOpen(true);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const value: CommandPaletteContextValue = {
    open,
    setOpen,
    openPalette,
    closePalette,
  };

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPalette />
    </CommandPaletteContext.Provider>
  );
}

function CommandPalette() {
  const { open, setOpen, closePalette } = useCommandPalette();
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Navigation actions
  const navigationActions: CommandAction[] = React.useMemo(() => [
    {
      id: 'nav:dashboard',
      name: 'Overview',
      keywords: 'dashboard home main',
      section: 'Navigation',
      icon: 'dashboard',
      href: '/dashboard',
    },
    {
      id: 'nav:campaigns',
      name: 'Campaigns',
      keywords: 'marketing ads advertising',
      section: 'Navigation',
      icon: 'campaign',
      href: '/campaigns',
    },
    {
      id: 'nav:live-feed',
      name: 'Live Feed',
      keywords: 'realtime events activity',
      section: 'Navigation',
      icon: 'bolt',
      href: '/live-feed',
    },
    {
      id: 'nav:integrations',
      name: 'Integrations',
      keywords: 'connect apps services shopify meta google',
      section: 'Navigation',
      icon: 'link',
      href: '/integrations',
    },
    {
      id: 'nav:team',
      name: 'Team Settings',
      keywords: 'users members settings',
      section: 'Settings',
      icon: 'group',
      href: '/settings/team',
    },
  ], []);

  // Group actions by section
  const grouped = React.useMemo(() => {
    const bySection: Record<string, CommandAction[]> = {};
    navigationActions.forEach((a) => {
      if (!bySection[a.section]) bySection[a.section] = [];
      bySection[a.section].push(a);
    });
    return bySection;
  }, [navigationActions]);

  const handleSelect = React.useCallback((action: CommandAction) => {
    if (action.href) {
      router.push(action.href);
      closePalette();
    } else if (action.perform) {
      action.perform();
      closePalette();
    }
  }, [router, closePalette]);

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={closePalette}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2">
        <Command
          className="overflow-hidden rounded-lg border border-border-light bg-white shadow-2xl"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              closePalette();
            }
          }}
        >
          {/* Search Input */}
          <div className="flex items-center border-b border-border-light px-4">
            <span
              className="material-symbols-outlined text-[20px] text-text-subtle"
              aria-hidden="true"
            >
              search
            </span>
            <Command.Input
              ref={inputRef}
              placeholder="Search navigation..."
              className="flex-1 bg-transparent py-4 pl-3 text-sm text-text-main placeholder:text-text-subtle outline-none"
            />
            <kbd className="text-[10px] text-text-subtle font-medium bg-slate-100 border border-border-light px-1.5 py-0.5">
              esc
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-text-muted">
              No results found.
            </Command.Empty>

            {Object.entries(grouped).map(([section, actions]) => (
              <Command.Group
                key={section}
                heading={section}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-text-subtle"
              >
                {actions.map((action) => (
                  <Command.Item
                    key={action.id}
                    value={`${action.name} ${action.keywords || ''}`}
                    onSelect={() => handleSelect(action)}
                    className="flex cursor-pointer items-center gap-3 rounded px-3 py-2.5 text-sm text-text-muted transition-colors data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary"
                  >
                    <span
                      className="material-symbols-outlined text-[20px]"
                      aria-hidden="true"
                    >
                      {action.icon}
                    </span>
                    <span className="flex-1 font-medium">{action.name}</span>
                    <span
                      className="material-symbols-outlined text-[16px] opacity-0 data-[selected=true]:opacity-100"
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border-light bg-slate-50 px-4 py-2 text-xs text-text-subtle">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="bg-white border border-border-light px-1.5 py-0.5 rounded text-[10px]">
                  ↑
                </kbd>
                <kbd className="bg-white border border-border-light px-1.5 py-0.5 rounded text-[10px]">
                  ↓
                </kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-white border border-border-light px-1.5 py-0.5 rounded text-[10px]">
                  ↵
                </kbd>
                <span>Select</span>
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="bg-white border border-border-light px-1.5 py-0.5 rounded text-[10px]">
                ⌘K
              </kbd>
              <span>Toggle</span>
            </span>
          </div>
        </Command>
      </div>
    </>
  );
}

export default CommandPalette;
