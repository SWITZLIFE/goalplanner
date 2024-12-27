import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface GoalProgressProps {
  progress: number;
  variant?: "linear" | "circular";
  size?: "sm" | "md" | "lg";
}

export function GoalProgress({ progress, variant = "linear", size = "sm" }: GoalProgressProps) {
  if (variant === "linear") {
    return (
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
      </div>
    );
  }

  const strokeWidth = size === "sm" ? 4 : size === "md" ? 6 : 8;
  const radius = size === "sm" ? 16 : size === "md" ? 24 : 32;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  const dimensions = {
    sm: 40,
    md: 56,
    lg: 72,
  };

  const dim = dimensions[size];

  return (
    <div className="relative" style={{ width: dim, height: dim }}>
      <svg
        className={cn(
          "transform -rotate-90",
          size === "sm" && "w-10 h-10",
          size === "md" && "w-14 h-14",
          size === "lg" && "w-18 h-18"
        )}
        viewBox={`0 0 ${dim} ${dim}`}
      >
        {/* Background circle */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          className="stroke-muted"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          className="stroke-primary transition-all duration-300 ease-in-out"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}