'use client';

import { UserButton } from '@clerk/nextjs';

const Header = () => {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border-light bg-white/80 backdrop-blur-sm px-6 shrink-0 z-10 sticky top-0">
      {/* Left side - empty or can add breadcrumbs later */}
      <div className="flex items-center gap-2">
      </div>

      {/* Right side - actions and user menu */}
      <div className="flex items-center gap-2">
        {/* Search button */}
        <button className="relative flex h-9 w-9 items-center justify-center text-text-muted hover:text-text-main hover:bg-slate-50 rounded-lg transition-all">
          <span className="material-symbols-outlined text-[20px]">search</span>
        </button>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center text-text-muted hover:text-text-main hover:bg-slate-50 rounded-lg transition-all">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute right-2 top-2 h-2 w-2 bg-primary rounded-full ring-2 ring-white"></span>
        </button>

        {/* Help */}
        <button className="relative flex h-9 w-9 items-center justify-center text-text-muted hover:text-text-main hover:bg-slate-50 rounded-lg transition-all">
          <span className="material-symbols-outlined text-[20px]">help</span>
        </button>

        <div className="h-6 w-px bg-border-light mx-1" />

        <UserButton
          appearance={{
            elements: {
              avatarBox: 'h-8 w-8 rounded-lg',
              userButtonTrigger: 'focus:shadow-none',
            },
          }}
          afterSignOutUrl="/sign-in"
        />
      </div>
    </header>
  );
};

export default Header;
