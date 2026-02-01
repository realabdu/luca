"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { IntegrationPlatform } from "@/types/integrations";
import { PlatformIcon, PLATFORM_COLORS } from "@/components/icons/PlatformIcons";
import { SetupStepper } from "@/components/integrations/SetupStepper";
import { IntegrationCard, ComingSoonCard } from "@/components/integrations/IntegrationCard";
import { ConnectionHealthTable } from "@/components/integrations/ConnectionHealthTable";
import { DisconnectDialog } from "@/components/integrations/DisconnectDialog";
import { useIntegrationsQuery } from "@/features/integrations/hooks/use-integrations-queries";
import { useDisconnectIntegration, useConnectIntegration } from "@/features/integrations/hooks/use-integrations-mutations";
import { queryKeys } from "@/lib/query-client/query-keys";

const PLATFORM_DISPLAY: Record<IntegrationPlatform, { name: string; description: string; category: "ecommerce" | "ads" }> = {
  salla: { name: "Salla", description: "Saudi Arabia's leading e-commerce platform", category: "ecommerce" },
  shopify: { name: "Shopify", description: "Global e-commerce platform", category: "ecommerce" },
  meta: { name: "Meta Ads", description: "Connect Facebook & Instagram ad accounts", category: "ads" },
  google: { name: "Google Ads", description: "Connect Search & Display ad campaigns", category: "ads" },
  tiktok: { name: "TikTok Business", description: "Connect TikTok advertising accounts", category: "ads" },
  snapchat: { name: "Snapchat Ads", description: "Connect Snapchat marketing accounts", category: "ads" },
};

export default function IntegrationsContent() {
  const { isLoading: isAuthLoading, canQuery, showNoOrgMessage } = useAuthGuard();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [disconnectDialog, setDisconnectDialog] = useState<{ open: boolean; platform: IntegrationPlatform | null; integrationId: string | null }>({
    open: false,
    platform: null,
    integrationId: null,
  });

  const { data: integrations, isLoading: isLoadingIntegrations } = useIntegrationsQuery();
  const { mutate: disconnectIntegration, isPending: isDisconnecting } = useDisconnectIntegration();
  const { mutate: connectIntegration } = useConnectIntegration();

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) {
      setNotification({ type: "success", message: `Successfully connected to ${PLATFORM_DISPLAY[connected as IntegrationPlatform]?.name || connected}!` });
      window.history.replaceState({}, "", "/integrations");
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all });
    } else if (error) {
      setNotification({ type: "error", message: decodeURIComponent(error) });
      window.history.replaceState({}, "", "/integrations");
    }
  }, [searchParams, queryClient]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleConnect = (platform: IntegrationPlatform) => {
    if (platform === "shopify") {
      const shopDomain = prompt("Enter your Shopify store domain (e.g., your-store.myshopify.com):");
      if (!shopDomain) return;
      if (!shopDomain.includes(".myshopify.com")) {
        setNotification({ type: "error", message: "Please enter a valid Shopify domain ending in .myshopify.com" });
        return;
      }
      connectIntegration({ platform, shopDomain });
      return;
    }
    connectIntegration({ platform });
  };

  const handleDisconnect = () => {
    const { integrationId, platform } = disconnectDialog;
    if (!integrationId || !platform) return;
    disconnectIntegration(integrationId, {
      onSuccess: () => {
        setNotification({ type: "success", message: `Disconnected from ${PLATFORM_DISPLAY[platform].name}` });
        setDisconnectDialog({ open: false, platform: null, integrationId: null });
      },
      onError: () => {
        setNotification({ type: "error", message: "Failed to disconnect. Please try again." });
        setDisconnectDialog({ open: false, platform: null, integrationId: null });
      },
    });
  };

  const getIntegrationStatus = (platform: IntegrationPlatform) => integrations?.find((i) => i.platform === platform);

  const ecommercePlatforms: IntegrationPlatform[] = ["salla", "shopify"];
  const adsPlatforms: IntegrationPlatform[] = ["meta", "google", "tiktok", "snapchat"];

  const connectedCount = integrations?.filter((i) => i.isConnected).length || 0;
  const sallaConnected = getIntegrationStatus("salla")?.isConnected;
  const shopifyConnected = getIntegrationStatus("shopify")?.isConnected;
  const ecommerceConnected = sallaConnected || shopifyConnected;
  const adsConnectedCount = connectedCount - (sallaConnected ? 1 : 0) - (shopifyConnected ? 1 : 0);

  if (isAuthLoading) {
    return <LoadingState />;
  }

  if (showNoOrgMessage) {
    return <NoOrgState />;
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-10 animate-in fade-in duration-500">
      {notification && (
        <div role="alert" aria-live="polite" className={`fixed top-6 right-6 z-50 p-4 shadow-xl border backdrop-blur-md ${notification.type === "success" ? "bg-emerald-50/90 border-emerald-200 text-emerald-900" : "bg-red-50/90 border-red-200 text-red-900"}`}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px] bg-white/50 p-1" aria-hidden="true">{notification.type === "success" ? "check" : "priority_high"}</span>
            <span className="text-sm font-semibold">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-4 p-1" aria-label="Dismiss notification">
              <span className="material-symbols-outlined text-[16px] block" aria-hidden="true">close</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border-light">
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-text-main text-balance">Integrations & Setup</h1>
          <p className="text-text-muted text-base max-w-2xl text-pretty leading-relaxed">
            Centralize your data. Connect your store and advertising platforms to unlock unified analytics and pixel tracking.
          </p>
        </div>
      </div>

      <SetupStepper ecommerceConnected={!!ecommerceConnected} adsConnectedCount={adsConnectedCount} />

      <section className="space-y-6">
        <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
          <span className="w-1 h-6 bg-primary mr-1" aria-hidden="true" />E-commerce Source
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ecommercePlatforms.map((platform) => (
            <IntegrationCard
              key={platform}
              platform={platform}
              name={PLATFORM_DISPLAY[platform].name}
              description={PLATFORM_DISPLAY[platform].description}
              category={PLATFORM_DISPLAY[platform].category}
              integration={getIntegrationStatus(platform)}
              isLoading={isLoadingIntegrations}
              onConnect={handleConnect}
              onDisconnect={(p, id) => setDisconnectDialog({ open: true, platform: p, integrationId: id })}
              variant="large"
            />
          ))}
          <ComingSoonCard name="Zid" />
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
          <span className="w-1 h-6 bg-secondary-foreground/20 mr-1" aria-hidden="true" />Advertising Channels
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {adsPlatforms.map((platform) => (
            <IntegrationCard
              key={platform}
              platform={platform}
              name={PLATFORM_DISPLAY[platform].name}
              description={PLATFORM_DISPLAY[platform].description}
              category={PLATFORM_DISPLAY[platform].category}
              integration={getIntegrationStatus(platform)}
              isLoading={isLoadingIntegrations}
              onConnect={handleConnect}
              onDisconnect={(p, id) => setDisconnectDialog({ open: true, platform: p, integrationId: id })}
              variant="compact"
            />
          ))}
        </div>
      </section>

      {integrations && <ConnectionHealthTable integrations={integrations} platformDisplay={PLATFORM_DISPLAY} />}

      <DisconnectDialog
        open={disconnectDialog.open}
        platformName={disconnectDialog.platform ? PLATFORM_DISPLAY[disconnectDialog.platform].name : ""}
        isDisconnecting={isDisconnecting}
        onConfirm={handleDisconnect}
        onCancel={() => setDisconnectDialog({ open: false, platform: null, integrationId: null })}
      />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="p-8 max-w-[1200px] mx-auto flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <span className="material-symbols-outlined text-[32px] text-text-muted animate-spin" aria-hidden="true">progress_activity</span>
        <p className="text-sm text-text-muted">Loading...</p>
      </div>
    </div>
  );
}

function NoOrgState() {
  return (
    <div className="p-8 max-w-[1200px] mx-auto flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="size-16 bg-amber-50 flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px] text-amber-600" aria-hidden="true">domain_add</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-main mb-2">No Organization Selected</h2>
          <p className="text-sm text-text-muted max-w-md">Please select or create an organization from the organization switcher to manage your integrations.</p>
        </div>
      </div>
    </div>
  );
}
