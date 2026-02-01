'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { UserButton, useAuth } from '@clerk/nextjs';
import { useOnboardingStatusQuery } from '@/features/onboarding/hooks/use-onboarding-queries';

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  // Use new React Query hook
  const { data: onboardingStatus } = useOnboardingStatusQuery();

  const showOnboardingCard = onboardingStatus &&
    onboardingStatus.status !== "completed" &&
    !onboardingStatus.hasStoreConnected;

  const coreWorkspaces = [
    { label: 'Overview', path: '/dashboard', icon: 'dashboard' },
    { label: 'Campaigns', path: '/campaigns', icon: 'campaign' },
    { label: 'Live Feed', path: '/live-feed', icon: 'bolt' },
    { label: 'Integrations', path: '/integrations', icon: 'link' },
  ];

  const settingsItems = [
    { label: 'Team', path: '/settings/team', icon: 'group' },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="hidden w-60 flex-col border-r border-border-light bg-white lg:flex">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-border-light">
        <div className="flex h-9 w-9 items-center justify-center bg-primary shadow-sm">
          <Image
            src="/luca-logo.png"
            alt="Luca"
            width={22}
            height={22}
            className="object-contain"
          />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-text-main">Luca</h1>
          <p className="text-[10px] text-text-muted font-medium">Analytics Dashboard</p>
        </div>
      </div>


      {/* Onboarding Progress Card */}
      {showOnboardingCard && (
        <div className="px-4 py-3 border-b border-border-light">
          <button
            onClick={() => router.push('/onboarding')}
            className="w-full p-4 bg-primary/5 border border-primary/10 hover:border-primary/20 transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="size-9 bg-primary flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-white text-[18px]" aria-hidden="true">
                  rocket_launch
                </span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-text-main">Complete Setup</p>
                <p className="text-xs text-text-muted">
                  Step {onboardingStatus.hasStoreConnected ? 2 : 1} of 2
                </p>
              </div>
              <span className="material-symbols-outlined text-text-muted text-[18px] group-hover:translate-x-0.5 transition-transform" aria-hidden="true">
                arrow_forward
              </span>
            </div>
            {/* Progress Bar */}
            <div className="h-1.5 bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((onboardingStatus.hasStoreConnected ? 1 : 0) + (onboardingStatus.hasAdsConnected ? 1 : 0)) / 2 * 100}%` }}
              />
            </div>
          </button>
        </div>
      )}

      {/* Nav Content */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-5 space-y-6">

        {/* Search */}
        <div className="relative">
          <label htmlFor="sidebar-search" className="sr-only">
            Search navigation
          </label>
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-text-subtle"
            aria-hidden="true"
          >
            search
          </span>
          <input
            id="sidebar-search"
            type="text"
            placeholder="Search..."
            className="w-full bg-slate-50 border-0 pl-10 pr-3 py-2.5 text-sm text-text-main placeholder:text-text-subtle focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
          />
          <kbd
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-subtle font-medium bg-white border border-border-light px-1.5 py-0.5 hidden sm:inline"
            aria-hidden="true"
          >
            /
          </kbd>
        </div>

        {/* Core Workspaces */}
        <div className="space-y-1">
          <h3 className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
            Workspace
          </h3>
          <ul className="flex flex-col gap-0.5">
            {coreWorkspaces.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.path}
                  className={`
                    relative flex items-center gap-3 px-3 py-2.5 text-sm transition-all
                    ${isActive(item.path)
                      ? 'bg-primary/10 font-semibold text-primary nav-active'
                      : 'font-medium text-text-muted hover:bg-slate-50 hover:text-text-main'
                    }
                  `}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isActive(item.path) ? 'filled text-primary' : ''}`} aria-hidden="true">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Settings */}
        <div className="space-y-1">
          <h3 className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
            Settings
          </h3>
          <ul className="flex flex-col gap-0.5">
            {settingsItems.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.path}
                  className={`
                    relative flex items-center gap-3 px-3 py-2.5 text-sm transition-all
                    ${isActive(item.path)
                      ? 'bg-primary/10 font-semibold text-primary nav-active'
                      : 'font-medium text-text-muted hover:bg-slate-50 hover:text-text-main'
                    }
                  `}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isActive(item.path) ? 'filled text-primary' : ''}`} aria-hidden="true">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Footer - User Profile */}
      <div className="border-t border-border-light p-4">
        <div className="flex items-center gap-3 p-2 hover:bg-slate-50 transition-colors cursor-pointer">
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'h-9 w-9',
                userButtonTrigger: 'focus:shadow-none',
              },
            }}
            afterSignOutUrl="/sign-in"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-main truncate">Account</p>
            <p className="text-xs text-text-muted truncate">Manage settings</p>
          </div>
          <span className="material-symbols-outlined text-[18px] text-text-subtle" aria-hidden="true">
            chevron_right
          </span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
