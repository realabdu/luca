import { IntegrationPlatform } from "@/types/integrations";
import { MetaLogo, TiktokLogo, GoogleLogo, SnapchatLogo } from "@phosphor-icons/react";

// Extended platform type to include Luca branding
type ExtendedPlatform = IntegrationPlatform | "luca";

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
    default:
      return null;
  }
}

// Color map for backgrounds
export const PLATFORM_COLORS: Record<ExtendedPlatform, string> = {
  luca: "#107a76",
  salla: "#004956",
  meta: "#0081FB",
  google: "#FBBC04",
  tiktok: "#000000",
  snapchat: "#FFFC00",
};
