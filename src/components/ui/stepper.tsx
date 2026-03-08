"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  id: string;
  label: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  /** When set, steps with index < completedStep show as complete (e.g. 4 = all 4 steps done) */
  completedStep?: number;
  onStepClick?: (index: number) => void;
  className?: string;
}

export function Stepper({ steps, currentStep, completedStep, onStepClick, className }: StepperProps) {
  const effectiveComplete = completedStep ?? currentStep;
  return (
    <nav aria-label="Progress" className={cn("w-full", className)}>
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isComplete = index < effectiveComplete;
          const isCurrent = index === currentStep && (completedStep === undefined || completedStep <= currentStep);
          const isClickable = onStepClick && (isComplete || index <= currentStep);

          return (
            <li
              key={step.id}
              className={cn(
                "relative flex flex-1 flex-col items-center",
                index < steps.length - 1 && "pr-4 sm:pr-8"
              )}
            >
              <button
                type="button"
                onClick={() => isClickable && onStepClick(index)}
                disabled={!isClickable}
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isComplete && "border-green-500 bg-green-500 text-white",
                  isCurrent && "border-primary bg-surface-card text-primary",
                  !isComplete && !isCurrent && "border-surface-border bg-surface-light text-accent-muted",
                  isClickable && "cursor-pointer hover:border-primary/70",
                  isComplete && isClickable && "hover:border-green-400 hover:bg-green-400",
                  !isClickable && "cursor-default"
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isComplete ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </button>
              <span
                className={cn(
                  "mt-2 text-center text-xs font-medium sm:text-sm",
                  isCurrent && "text-primary",
                  isComplete && !isCurrent && "text-green-400",
                  !isComplete && !isCurrent && "text-accent-muted"
                )}
              >
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[calc(50%+1.25rem)] top-5 h-0.5 w-[calc(100%-2.5rem)] -translate-y-1/2 rounded-full transition-colors",
                    isComplete ? "bg-green-500" : "bg-surface-border"
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
