import { IntegrationPlatform } from "@/types/integrations";
import { MetaLogo, TiktokLogo, GoogleLogo, SnapchatLogo } from "@phosphor-icons/react";

// Extended platform type to include Luca branding
export type PlatformIconName = IntegrationPlatform | "luca";
type ExtendedPlatform = PlatformIconName;

interface PlatformIconProps {
  platform: ExtendedPlatform;
  className?: string;
  size?: number;
}


export function PlatformIcon({ platform, className = "", size = 24 }: PlatformIconProps) {
  const iconProps = { size, className, weight: "fill" as const };

  switch (platform) {
    case "luca":
      return (
        <div
          className={`flex items-center justify-center rounded-sm ${className}`}
          style={{
            width: size,
            height: size,
            backgroundColor: "#107a76",
            padding: size * 0.15,
          }}
        >
          <img
            src="/luca-logo.png"
            alt="Luca"
            width={size * 0.7}
            height={size * 0.7}
            className="object-contain"
          />
        </div>
      );
    case "salla":
      return (
        <img
          src="/salla-logo.svg"
          alt="Salla"
          width={size}
          height={size}
          className={className}
        />
      );
    case "meta":
      return <MetaLogo {...iconProps} color="#0081FB" />;
    case "google":
      return (
        <img 
          src="/google-ads.svg" 
          alt="Google Ads" 
          width={size} 
          height={size} 
          className={className} 
        />
      );
    case "tiktok":
      return <TiktokLogo {...iconProps} color="#000000" />;
    case "snapchat":
      return (
        <img
          src="/snapchat-logo-svgrepo-com.svg"
          alt="Snapchat"
          width={size}
          height={size}
          className={className}
        />
      );
    case "shopify":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={className}
        >
          <path
            d="M20.5 6.9c-.02-.14-.14-.22-.24-.22-.1 0-2.02-.04-2.02-.04s-1.6-1.56-1.76-1.72c-.16-.16-.47-.11-.59-.08l-.8.25c-.08-.27-.21-.6-.39-.95-.57-1.09-1.41-1.67-2.42-1.67h-.04c-.19-.22-.42-.32-.62-.32-1.31.04-2.61.98-3.66 2.66-.74 1.18-1.3 2.66-1.47 3.81l-2.57.8c-.76.24-.78.26-.88.98-.07.53-2.07 15.94-2.07 15.94l16.6 2.87 7.19-1.79s-2.93-19.86-2.96-20z"
            fill="#95BF47"
          />
          <path
            d="M18.24 6.64s-2.02-.04-2.02-.04-1.6-1.56-1.76-1.72c-.06-.06-.13-.08-.21-.1v23.86l7.19-1.79s-2.93-19.86-2.96-20c-.02-.14-.14-.22-.24-.22z"
            fill="#5E8E3E"
          />
          <path
            d="M12.58 8.68l-.84 3.13s-.93-.43-2.04-.36c-1.62.1-1.64 1.12-1.62 1.38.09 1.4 3.76 1.7 3.97 4.98.16 2.58-1.37 4.34-3.57 4.48-2.64.17-4.1-1.39-4.1-1.39l.56-2.38s1.47 1.11 2.64 1.03c.77-.05 1.04-.67 1.01-1.11-.12-1.82-3.11-1.72-3.3-4.72-.16-2.52 1.5-5.08 5.15-5.31.95-.06 1.43.18 1.43.18l.71.09z"
            fill="#fff"
          />
        </svg>
      );
    default:
      return null;
  }
}

// Color map for backgrounds
export const PLATFORM_COLORS: Record<ExtendedPlatform, string> = {
  luca: "#107a76",
  salla: "#004956",
  shopify: "#96bf48",
  meta: "#0081FB",
  google: "#FBBC04",
  tiktok: "#000000",
  snapchat: "#FFFC00",
};
