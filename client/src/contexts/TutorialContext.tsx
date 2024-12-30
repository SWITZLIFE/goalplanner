import React, { createContext, useContext, useState } from "react";
import { useLocation } from "wouter";

type TutorialStep = {
  title: string;
  description: string;
  target: string;
  placement?: "top" | "bottom" | "left" | "right";
};

const tutorialSteps: TutorialStep[] = [
  {
    title: "Welcome to Vision Board!",
    description: "Let's take a quick tour of the app's features. Click 'Next' to continue.",
    target: "[data-tutorial='welcome']",
    placement: "bottom",
  },
  {
    title: "Create New Goals",
    description: "Start by creating new goals to track your progress. Click the 'Create Goal' button to get started.",
    target: "[data-tutorial='create-goal']",
    placement: "right",
  },
  {
    title: "Your Vision Board",
    description: "Visualize your goals by adding images to your vision board. This helps keep you motivated and focused.",
    target: "[data-tutorial='vision-board']",
    placement: "left",
  },
  {
    title: "Goal Tracking",
    description: "Track your goals and update your progress regularly to stay on target.",
    target: "[data-tutorial='goal-list']",
    placement: "right",
  },
  {
    title: "Analytics Dashboard",
    description: "View detailed analytics of your progress in the Analytics section.",
    target: "[data-tutorial='analytics-button']",
    placement: "bottom",
  },
  {
    title: "Reward Store",
    description: "Earn coins and spend them in the reward store as you achieve your goals!",
    target: "[data-tutorial='rewards-button']",
    placement: "bottom",
  }
];

type TutorialContextType = {
  isOpen: boolean;
  currentStep: number;
  steps: TutorialStep[];
  startTutorial: () => void;
  endTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
};

const TutorialContext = createContext<TutorialContextType | null>(null);

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
}

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [location, setLocation] = useLocation();

  const startTutorial = () => {
    setIsOpen(true);
    setCurrentStep(0);
    setLocation("/"); // Start tutorial from home page
  };

  const endTutorial = () => {
    setIsOpen(false);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      endTutorial();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <TutorialContext.Provider
      value={{
        isOpen,
        currentStep,
        steps: tutorialSteps,
        startTutorial,
        endTutorial,
        nextStep,
        previousStep,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}