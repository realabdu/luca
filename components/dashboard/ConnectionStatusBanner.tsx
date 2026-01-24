"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface DashboardWarning {
  platform: string;
  message: string;
  action: "reconnect" | "retry" | "contact_support";
  severity: "error" | "warning" | "info";
}

interface ConnectionStatusBannerProps {
  warnings: DashboardWarning[];
  onRetry?: () => void;
}

const PLATFORM_DISPLAY: Record<string, string> = {
  salla: "Salla",
  snapchat: "Snapchat",
  meta: "Meta",
  google: "Google",
  tiktok: "TikTok",
};

export default function ConnectionStatusBanner({
  warnings,
  onRetry,
}: ConnectionStatusBannerProps) {
  const router = useRouter();
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set());

  const visibleWarnings = warnings.filter(
    (w) => !dismissedWarnings.has(`${w.platform}-${w.message}`)
  );

  if (visibleWarnings.length === 0) {
    return null;
  }

  const handleAction = (warning: DashboardWarning) => {
    switch (warning.action) {
      case "reconnect":
        router.push("/integrations");
        break;
      case "retry":
        onRetry?.();
        break;
      case "contact_support":
        window.open("mailto:support@luca.ai", "_blank");
        break;
    }
  };

  const dismissWarning = (warning: DashboardWarning) => {
    setDismissedWarnings((prev) =>
      new Set(prev).add(`${warning.platform}-${warning.message}`)
    );
  };

  const getActionLabel = (action: DashboardWarning["action"]) => {
    switch (action) {
      case "reconnect":
        return "Reconnect";
      case "retry":
        return "Retry";
      case "contact_support":
        return "Get Help";
    }
  };

  const getSeverityStyles = (severity: DashboardWarning["severity"]) => {
    switch (severity) {
      case "error":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-800",
          icon: "error",
          iconColor: "text-red-500",
        };
      case "warning":
        return {
          bg: "bg-amber-50",
          border: "border-amber-200",
          text: "text-amber-800",
          icon: "warning",
          iconColor: "text-amber-500",
        };
      case "info":
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          text: "text-blue-800",
          icon: "info",
          iconColor: "text-blue-500",
        };
    }
  };

  // Group multiple warnings if they exist
  if (visibleWarnings.length > 1) {
    return (
      <div className="space-y-2 mb-6">
        {visibleWarnings.map((warning, index) => {
          const styles = getSeverityStyles(warning.severity);
          return (
            <div
              key={`${warning.platform}-${index}`}
              className={`flex items-center justify-between p-3 border rounded-lg ${styles.bg} ${styles.border}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`material-symbols-outlined text-[20px] ${styles.iconColor}`}
                >
                  {styles.icon}
                </span>
                <div>
                  <span className={`font-semibold ${styles.text}`}>
                    {PLATFORM_DISPLAY[warning.platform] || warning.platform}
                  </span>
                  <span className={`ml-2 text-sm ${styles.text} opacity-80`}>
                    {warning.message}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAction(warning)}
                  className={`px-3 py-1.5 text-sm font-semibold rounded ${
                    warning.severity === "error"
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : warning.severity === "warning"
                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  } transition-colors`}
                >
                  {getActionLabel(warning.action)}
                </button>
                <button
                  onClick={() => dismissWarning(warning)}
                  className={`p-1 ${styles.text} opacity-60 hover:opacity-100 transition-opacity`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    close
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Single warning
  const warning = visibleWarnings[0];
  const styles = getSeverityStyles(warning.severity);

  return (
    <div
      className={`flex items-center justify-between p-4 border rounded-lg mb-6 ${styles.bg} ${styles.border}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`material-symbols-outlined text-[24px] ${styles.iconColor}`}
        >
          {styles.icon}
        </span>
        <div>
          <span className={`font-semibold ${styles.text}`}>
            {PLATFORM_DISPLAY[warning.platform] || warning.platform}
          </span>
          <span className={`ml-2 ${styles.text}`}>{warning.message}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleAction(warning)}
          className={`px-4 py-2 text-sm font-bold rounded-lg ${
            warning.severity === "error"
              ? "bg-red-600 text-white hover:bg-red-700"
              : warning.severity === "warning"
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
          } transition-colors shadow-sm`}
        >
          {getActionLabel(warning.action)}
        </button>
        <button
          onClick={() => dismissWarning(warning)}
          className={`p-1 ${styles.text} opacity-60 hover:opacity-100 transition-opacity`}
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    </div>
  );
}
