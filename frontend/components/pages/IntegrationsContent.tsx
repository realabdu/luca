"use client";

import { useAuth, useOrganization } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { PLATFORM_INFO, IntegrationPlatform } from "@/types/integrations";
import { PlatformIcon, PLATFORM_COLORS } from "@/components/icons/PlatformIcons";
import { useApiQuery, useApiMutation, invalidateQueries, Integration } from "@/lib/api-client";

// Platform display configuration
const PLATFORM_DISPLAY: Record<
  IntegrationPlatform,
  { name: string; description: string; category: "ecommerce" | "ads" }
> = {
  salla: {
    name: "Salla",
    description: "Saudi Arabia's leading e-commerce platform",
    category: "ecommerce",
  },
  shopify: {
    name: "Shopify",
    description: "Global e-commerce platform",
    category: "ecommerce",
  },
  meta: {
    name: "Meta Ads",
    description: "Connect Facebook & Instagram ad accounts",
    category: "ads",
  },
  google: {
    name: "Google Ads",
    description: "Connect Search & Display ad campaigns",
    category: "ads",
  },
  tiktok: {
    name: "TikTok Business",
    description: "Connect TikTok advertising accounts",
    category: "ads",
  },
  snapchat: {
    name: "Snapchat Ads",
    description: "Connect Snapchat marketing accounts",
    category: "ads",
  },
};

export default function IntegrationsContent() {
  const { isLoaded, isSignedIn } = useAuth();
  const { organization, isLoaded: isOrgLoaded } = useOrganization();
  const searchParams = useSearchParams();
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // AlertDialog state for disconnect confirmation
  const [disconnectDialog, setDisconnectDialog] = useState<{
    open: boolean;
    platform: IntegrationPlatform | null;
  }>({ open: false, platform: null });
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Only query when authenticated and organization is selected
  const canQuery = isLoaded && isSignedIn && isOrgLoaded && !!organization;

  // Fetch integrations from Django API
  const { data: integrations, isLoading: isLoadingIntegrations } = useApiQuery<Integration[]>(
    canQuery ? "/integrations/" : null
  );

  // Disconnect mutation
  const { mutate: disconnectIntegration, isLoading: isDisconnecting } = useApiMutation<void, void>(
    `/integrations/${disconnectDialog.platform}/disconnect/`,
    "POST"
  );

  // Handle OAuth redirect messages
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected) {
      setNotification({
        type: "success",
        message: `Successfully connected to ${PLATFORM_DISPLAY[connected as IntegrationPlatform]?.name || connected}!`,
      });
      // Clear URL params and invalidate cache
      window.history.replaceState({}, "", "/integrations");
      invalidateQueries("/integrations/");
    } else if (error) {
      setNotification({
        type: "error",
        message: decodeURIComponent(error),
      });
      window.history.replaceState({}, "", "/integrations");
    }
  }, [searchParams]);

  // Clear notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleConnect = (platform: IntegrationPlatform) => {
    // Shopify requires shop domain - prompt user for it
    if (platform === "shopify") {
      const shopDomain = prompt(
        "Enter your Shopify store domain (e.g., your-store.myshopify.com):"
      );
      if (!shopDomain) return;

      // Validate format
      if (!shopDomain.includes(".myshopify.com")) {
        setNotification({
          type: "error",
          message: "Please enter a valid Shopify domain ending in .myshopify.com",
        });
        return;
      }

      window.location.href = `/api/auth/shopify?shop=${encodeURIComponent(shopDomain)}`;
      return;
    }

    // Redirect to OAuth initiation endpoint
    window.location.href = `/api/auth/${platform}`;
  };

  const openDisconnectDialog = (platform: IntegrationPlatform) => {
    setDisconnectDialog({ open: true, platform });
    dialogRef.current?.showModal();
  };

  const closeDisconnectDialog = () => {
    setDisconnectDialog({ open: false, platform: null });
    dialogRef.current?.close();
  };

  const handleDisconnect = async () => {
    const platform = disconnectDialog.platform;
    if (!platform) return;

    try {
      // Find the integration ID
      const integration = integrations?.find((i) => i.platform === platform);
      if (integration) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://api.lucaserv.com"}/api/v1/integrations/${integration.id}/disconnect/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
      }
      // Invalidate cache
      invalidateQueries("/integrations/");
      invalidateQueries("/onboarding/");
      setNotification({
        type: "success",
        message: `Disconnected from ${PLATFORM_DISPLAY[platform].name}`,
      });
    } catch {
      setNotification({
        type: "error",
        message: "Failed to disconnect. Please try again.",
      });
    }
    closeDisconnectDialog();
  };

  const getIntegrationStatus = (platform: IntegrationPlatform) => {
    if (!integrations) return null;
    return integrations.find((i) => i.platform === platform);
  };

  const ecommercePlatforms: IntegrationPlatform[] = ["salla", "shopify"];
  const adsPlatforms: IntegrationPlatform[] = ["meta", "google", "tiktok", "snapchat"];

  const connectedCount = integrations?.filter((i) => i.is_connected).length || 0;
  const sallaConnected = getIntegrationStatus("salla")?.is_connected;
  const shopifyConnected = getIntegrationStatus("shopify")?.is_connected;
  const ecommerceConnected = sallaConnected || shopifyConnected;

  // Show loading state while checking organization
  if (!isLoaded || !isOrgLoaded) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[32px] text-text-muted animate-spin">progress_activity</span>
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  // Show message if signed in but no organization selected
  if (isSignedIn && !organization) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="size-16 bg-amber-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-amber-600">domain_add</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-main mb-2">No Organization Selected</h2>
            <p className="text-sm text-text-muted max-w-md">
              Please select or create an organization from the organization switcher to manage your integrations.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-10 animate-in fade-in duration-500">
      {/* Notification Banner */}
      {notification && (
        <div
          role="alert"
          className={`fixed top-6 right-6 z-50 p-4 shadow-xl border backdrop-blur-md ${
            notification.type === "success"
              ? "bg-emerald-50/90 border-emerald-200 text-emerald-900"
              : "bg-red-50/90 border-red-200 text-red-900"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px] bg-white/50 p-1">
              {notification.type === "success" ? "check" : "priority_high"}
            </span>
            <span className="text-sm font-semibold">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 p-1"
              aria-label="Dismiss notification"
            >
              <span className="material-symbols-outlined text-[16px] block">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border-light">
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-text-main text-balance">
            Integrations & Setup
          </h1>
          <p className="text-text-muted text-base max-w-2xl text-pretty leading-relaxed">
            Centralize your data. Connect your store and advertising platforms to unlock unified analytics and pixel tracking.
          </p>
        </div>
      </div>

      {/* Progress Steps (Premium Stepper) */}
      <div className="w-full max-w-2xl mx-auto">
        <div className="relative flex items-start">
          {/* Step 1: Connect Store */}
          <div className="flex-1 flex flex-col items-center">
            <div className="relative flex items-center w-full">
              <div
                className={`
                  relative z-10 flex items-center justify-center size-10 shrink-0 mx-auto
                  border-2 transition-colors
                  ${ecommerceConnected
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-text-muted border-border-light"
                  }
                `}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {ecommerceConnected ? "check" : "storefront"}
                </span>
              </div>
              {/* Right connector */}
              <div className="absolute left-1/2 top-1/2 -translate-y-1/2 w-1/2 h-0.5 bg-border-light">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: ecommerceConnected ? "100%" : "0%" }}
                />
              </div>
            </div>
            <div className="text-center mt-3">
              <span className={`text-sm font-bold block text-balance ${ecommerceConnected ? "text-primary" : "text-text-muted"}`}>
                Connect Store
              </span>
              <span className="text-xs text-text-muted">Start here</span>
            </div>
          </div>

          {/* Step 2: Activate Pixel */}
          <div className="flex-1 flex flex-col items-center">
            <div className="relative flex items-center w-full">
              {/* Left connector */}
              <div className="absolute right-1/2 top-1/2 -translate-y-1/2 w-1/2 h-0.5 bg-border-light">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: ecommerceConnected ? "100%" : "0%" }}
                />
              </div>
              <div
                className={`
                  relative z-10 flex items-center justify-center size-10 shrink-0 mx-auto
                  border-2 transition-colors
                  ${ecommerceConnected
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-text-muted border-border-light"
                  }
                `}
              >
                <span className="material-symbols-outlined text-[20px]">hub</span>
              </div>
              {/* Right connector */}
              <div className="absolute left-1/2 top-1/2 -translate-y-1/2 w-1/2 h-0.5 bg-border-light">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: ecommerceConnected ? "100%" : "0%" }}
                />
              </div>
            </div>
            <div className="text-center mt-3">
              <span className={`text-sm font-bold block text-balance ${ecommerceConnected ? "text-primary" : "text-text-muted"}`}>
                Activate Pixel
              </span>
              <span className="text-xs text-text-muted">Auto-configured</span>
            </div>
          </div>

          {/* Step 3: Connect Ads */}
          <div className="flex-1 flex flex-col items-center">
            <div className="relative flex items-center w-full">
              {/* Left connector */}
              <div className="absolute right-1/2 top-1/2 -translate-y-1/2 w-1/2 h-0.5 bg-border-light">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: connectedCount > 1 ? "100%" : "0%" }}
                />
              </div>
              <div
                className={`
                  relative z-10 flex items-center justify-center size-10 shrink-0 mx-auto
                  border-2 transition-colors
                  ${connectedCount > 1
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-text-muted border-border-light"
                  }
                `}
              >
                <span className="material-symbols-outlined text-[20px]">campaign</span>
              </div>
            </div>
            <div className="text-center mt-3">
              <span className={`text-sm font-bold block text-balance ${connectedCount > 1 ? "text-primary" : "text-text-muted"}`}>
                Connect Ads
              </span>
              <span className="text-xs text-text-muted tabular-nums">
                {connectedCount > 0 ? connectedCount - (sallaConnected ? 1 : 0) - (shopifyConnected ? 1 : 0) : 0} Connected
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* E-commerce Section */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
          <span className="w-1 h-6 bg-primary mr-1"></span>
          E-commerce Source
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ecommercePlatforms.map((platform) => {
            const status = getIntegrationStatus(platform);
            const display = PLATFORM_DISPLAY[platform];

            return (
              <div
                key={platform}
                className={`group relative flex flex-col p-6 border transition-colors ${
                  isLoadingIntegrations
                    ? "bg-white border-border-light"
                    : status?.is_connected
                      ? "bg-emerald-50/30 border-emerald-100 ring-1 ring-emerald-500/10"
                      : "bg-white border-border-light"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                     <div
                      className="size-14 flex items-center justify-center shadow-sm border border-gray-100 bg-white p-2.5"
                    >
                      <PlatformIcon platform={platform} size={36} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-text-main">{display.name}</h3>
                      <p className="text-sm text-text-muted">{display.category === 'ecommerce' ? 'Primary Datastore' : 'Ad Channel'}</p>
                    </div>
                  </div>
                  {isLoadingIntegrations ? (
                    <span className="w-16 h-6 bg-slate-100 animate-pulse" />
                  ) : status?.is_connected ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-emerald-100/50 text-emerald-700 border border-emerald-200/50 shadow-sm">
                      <span className="size-2 bg-emerald-500"></span>
                      Active
                    </span>
                  ) : null}
                </div>

                <p className="text-sm text-text-muted mb-6 leading-relaxed">
                   {isLoadingIntegrations ? (
                     <span className="block w-48 h-4 bg-slate-100 animate-pulse" />
                   ) : status?.is_connected ? `Connected to store: ${status.account_name}` : display.description}
                </p>

                <div className="mt-auto flex items-center gap-3">
                  {isLoadingIntegrations ? (
                    <div className="w-full h-11 bg-slate-100 animate-pulse" />
                  ) : status?.is_connected ? (
                    <>
                      <button className="flex-1 h-10 bg-white border border-border-light text-text-main text-sm font-semibold shadow-sm">
                        Sync Catalog
                      </button>
                      <button
                        onClick={() => openDisconnectDialog(platform)}
                        className="h-10 px-4 border border-red-100 text-red-600 bg-red-50/50"
                        aria-label="Disconnect integration"
                      >
                         <span className="material-symbols-outlined text-[20px]">link_off</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleConnect(platform)}
                      className="w-full h-11 bg-primary text-white text-sm font-bold shadow-sm flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">add_link</span>
                      Connect Store
                    </button>
                  )}
                </div>
              </div>
            );
          })}

           {/* Coming Soon Card */}
           <div className="group flex flex-col p-6 border border-dashed border-border-light bg-slate-50/50">
              <div className="flex items-center gap-4 mb-4 opacity-50">
                 <div className="size-14 flex items-center justify-center bg-white border border-border-light p-3 grayscale">
                   <span className="material-symbols-outlined text-[32px] text-gray-400">store</span>
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-text-muted">Zid</h3>
                    <p className="text-sm text-text-muted">E-commerce</p>
                 </div>
              </div>
              <div className="mt-auto">
                 <button disabled className="w-full h-11 border border-border-light bg-transparent text-text-muted text-sm font-semibold cursor-not-allowed">
                    Coming Soon
                 </button>
              </div>
           </div>
        </div>
      </section>

      {/* Advertising Channels */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
           <span className="w-1 h-6 bg-secondary-foreground/20 mr-1"></span>
           Advertising Channels
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
           {adsPlatforms.map((platform) => {
            const status = getIntegrationStatus(platform);
            const display = PLATFORM_DISPLAY[platform];

            return (
              <div
                key={platform}
                className={`group flex flex-col p-5 border ${
                   status?.is_connected
                    ? "bg-white border-border-light shadow-sm"
                    : "bg-white border-border-light"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div
                    className="size-12 flex items-center justify-center border border-gray-100/50 p-2"
                    style={{ backgroundColor: `${PLATFORM_COLORS[platform]}08` }}
                  >
                    <PlatformIcon platform={platform} size={28} />
                  </div>
                   {isLoadingIntegrations ? (
                    <span className="size-2.5 bg-slate-200 animate-pulse" />
                  ) : status?.is_connected ? (
                    <span className="size-2.5 bg-emerald-500"></span>
                  ) : null}
                </div>

                <h3 className="font-bold text-text-main mb-1">{display.name}</h3>
                <p className="text-xs text-text-muted h-8 mb-4 line-clamp-2">
                   {isLoadingIntegrations ? (
                     <span className="block w-24 h-3 bg-slate-100 animate-pulse" />
                   ) : status?.is_connected ? `Connected: ${status.account_name}` : display.description}
                </p>

                {isLoadingIntegrations ? (
                  <div className="mt-auto w-full h-9 bg-slate-100 animate-pulse" />
                ) : status?.is_connected ? (
                  <div className="mt-auto flex gap-2">
                    <button className="flex-1 h-9 bg-gray-50 text-text-main text-xs font-bold border border-gray-200/50">
                      Manage
                    </button>
                    <button
                      onClick={() => openDisconnectDialog(platform)}
                      className="h-9 px-2.5 border border-border-light text-text-muted bg-white"
                      aria-label="Disconnect integration"
                    >
                      <span className="material-symbols-outlined text-[16px]">link_off</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect(platform)}
                    className="mt-auto w-full h-9 border border-primary/20 text-primary text-xs font-bold bg-primary/5"
                  >
                    Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Connection Logs Table (Only if something is connected) */}
      {integrations && integrations.some((i) => i.is_connected) && (
        <section className="space-y-4 pt-4">
          <h2 className="text-xl font-bold text-text-main">Connection Health</h2>
          <div className="bg-white border border-border-light shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-border-light">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Platform</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Account ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Last Sync</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {integrations
                  .filter((i) => i.is_connected)
                  .map((integration) => (
                    <tr key={integration.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <PlatformIcon platform={integration.platform as IntegrationPlatform} size={20} />
                          <span className="font-semibold text-text-main text-sm">
                            {PLATFORM_DISPLAY[integration.platform as IntegrationPlatform]?.name || integration.platform}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-text-muted">
                        {integration.account_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-muted">
                        {integration.last_sync_at
                          ? new Date(integration.last_sync_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                          : "Pending..."}
                      </td>
                       <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                           <span className="size-1.5 bg-emerald-500"></span>
                          Healthy
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Disconnect Dialog */}
      <dialog
        ref={dialogRef}
        className="p-0 shadow-2xl backdrop:bg-black/20 backdrop:backdrop-blur-sm max-w-md w-full m-auto"
        onClose={closeDisconnectDialog}
      >
        <div className="p-6 bg-white">
          <div className="flex flex-col items-center text-center gap-4 mb-6">
            <div className="size-12 bg-red-50 flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-red-600 text-[24px]">link_off</span>
            </div>
            <div>
               <h3 className="text-xl font-bold text-text-main">Disconnect Integration?</h3>
               <p className="text-text-muted text-sm mt-2">
                This will stop data syncing from <strong>{disconnectDialog.platform ? PLATFORM_DISPLAY[disconnectDialog.platform].name : ""}</strong>. You can reconnect at any time.
               </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={closeDisconnectDialog}
              className="h-11 border border-gray-200 bg-white text-text-main text-sm font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleDisconnect}
              className="h-11 bg-red-600 text-white text-sm font-bold shadow-sm"
            >
              Disconnect
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
