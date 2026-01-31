"use client";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  steps: { label: string; description: string }[];
}

export default function OnboardingProgress({
  currentStep,
  totalSteps,
  steps,
}: OnboardingProgressProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative flex items-start">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isPending = stepNumber > currentStep;
          const isLast = index === steps.length - 1;

          return (
            <div
              key={stepNumber}
              className="flex-1 flex flex-col items-center"
            >
              {/* Step with connector */}
              <div className="relative flex items-center w-full">
                {/* Left connector line */}
                {index > 0 && (
                  <div className="flex-1 h-0.5 bg-border-light">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{
                        width: isCompleted || isCurrent ? "100%" : "0%",
                      }}
                    />
                  </div>
                )}

                {/* Step indicator */}
                <div
                  className={`
                    relative z-10 flex items-center justify-center size-10 shrink-0
                    font-bold text-sm border-2 transition-colors
                    ${
                      isCompleted
                        ? "bg-primary text-white border-primary"
                        : isCurrent
                          ? "bg-primary text-white border-primary ring-4 ring-primary/20"
                          : "bg-white text-text-muted border-border-light"
                    }
                  `}
                >
                  {isCompleted ? (
                    <span className="material-symbols-outlined text-[18px]">
                      check
                    </span>
                  ) : (
                    stepNumber
                  )}
                </div>

                {/* Right connector line */}
                {!isLast && (
                  <div className="flex-1 h-0.5 bg-border-light">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{
                        width: isCompleted ? "100%" : "0%",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Step Label */}
              <div className="text-center mt-3">
                <span
                  className={`
                    text-sm font-semibold block text-balance
                    ${isCurrent ? "text-primary" : isPending ? "text-text-muted" : "text-text-main"}
                  `}
                >
                  {step.label}
                </span>
                <span className="text-xs text-text-muted hidden sm:block">
                  {step.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
