'use client';

interface SetupStepperProps {
  ecommerceConnected: boolean;
  adsConnectedCount: number;
}

export function SetupStepper({ ecommerceConnected, adsConnectedCount }: SetupStepperProps) {
  const hasAdsConnected = adsConnectedCount > 0;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative flex items-start" role="list" aria-label="Setup progress">
        {/* Step 1: Connect Store */}
        <SetupStep
          stepNumber={1}
          title="Connect Store"
          subtitle="Start here"
          icon={ecommerceConnected ? 'check' : 'storefront'}
          isComplete={ecommerceConnected}
          showLeftConnector={false}
          showRightConnector={true}
          rightConnectorFilled={ecommerceConnected}
        />

        {/* Step 2: Activate Pixel */}
        <SetupStep
          stepNumber={2}
          title="Activate Pixel"
          subtitle="Auto-configured"
          icon="hub"
          isComplete={ecommerceConnected}
          showLeftConnector={true}
          leftConnectorFilled={ecommerceConnected}
          showRightConnector={true}
          rightConnectorFilled={ecommerceConnected}
        />

        {/* Step 3: Connect Ads */}
        <SetupStep
          stepNumber={3}
          title="Connect Ads"
          subtitle={`${adsConnectedCount} Connected`}
          icon="campaign"
          isComplete={hasAdsConnected}
          showLeftConnector={true}
          leftConnectorFilled={hasAdsConnected}
          showRightConnector={false}
        />
      </div>
    </div>
  );
}

interface SetupStepProps {
  stepNumber: number;
  title: string;
  subtitle: string;
  icon: string;
  isComplete: boolean;
  showLeftConnector?: boolean;
  leftConnectorFilled?: boolean;
  showRightConnector?: boolean;
  rightConnectorFilled?: boolean;
}

function SetupStep({
  stepNumber,
  title,
  subtitle,
  icon,
  isComplete,
  showLeftConnector = false,
  leftConnectorFilled = false,
  showRightConnector = false,
  rightConnectorFilled = false,
}: SetupStepProps) {
  return (
    <div className="flex-1 flex flex-col items-center" role="listitem">
      <div className="relative flex items-center w-full">
        {/* Left connector */}
        {showLeftConnector && (
          <div className="absolute right-1/2 top-1/2 -translate-y-1/2 w-1/2 h-0.5 bg-border-light">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: leftConnectorFilled ? '100%' : '0%' }}
            />
          </div>
        )}

        {/* Step circle */}
        <div
          className={`
            relative z-10 flex items-center justify-center size-10 shrink-0 mx-auto
            border-2 transition-colors
            ${
              isComplete
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-text-muted border-border-light'
            }
          `}
          aria-label={`Step ${stepNumber}: ${title} - ${isComplete ? 'Complete' : 'Incomplete'}`}
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
            {icon}
          </span>
        </div>

        {/* Right connector */}
        {showRightConnector && (
          <div className="absolute left-1/2 top-1/2 -translate-y-1/2 w-1/2 h-0.5 bg-border-light">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: rightConnectorFilled ? '100%' : '0%' }}
            />
          </div>
        )}
      </div>
      <div className="text-center mt-3">
        <span
          className={`text-sm font-bold block text-balance ${
            isComplete ? 'text-primary' : 'text-text-muted'
          }`}
        >
          {title}
        </span>
        <span className="text-xs text-text-muted tabular-nums">{subtitle}</span>
      </div>
    </div>
  );
}
