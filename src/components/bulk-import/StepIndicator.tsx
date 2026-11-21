import { CheckCircle2 } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const STEP_TITLES = ["Upload File", "Map Columns", "Review & Fix"];

export default function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  // Build the steps from the prop instead of assuming a fixed three-step flow.
  const steps = Array.from({ length: Math.max(0, totalSteps) }, (_, index) => ({
    number: index + 1,
    title: STEP_TITLES[index] ?? `Step ${index + 1}`,
  }));

  return (
    <nav aria-label="Import progress" className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isComplete = step.number < currentStep;
        const isCurrent = step.number === currentStep;

        return (
          <div key={step.number} className="flex items-center">
            <div
              className="flex flex-col items-center"
              aria-current={isCurrent ? "step" : undefined}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  isComplete
                    ? "bg-success text-success-foreground"
                    : isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isComplete ? (
                  <>
                    <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                    <span className="sr-only">Completed</span>
                  </>
                ) : (
                  step.number
                )}
              </div>
              <p className="text-xs font-medium mt-2 text-center">
                {isComplete && <span className="sr-only">Completed: </span>}
                {step.title}
                {isCurrent && <span className="sr-only"> (current step)</span>}
              </p>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                aria-hidden="true"
                className={`flex-1 h-1 mx-2 transition-colors ${
                  isComplete ? "bg-success" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
