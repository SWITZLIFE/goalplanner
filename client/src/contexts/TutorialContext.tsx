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
    title: "Vision Board",
    description: "Add images to your vision board to visualize your goals and aspirations.",
    target: "[data-tutorial='vision-board']",
    placement: "right",
  },
  {
    title: "Goal Tracking",
    description: "Set and track your goals with our powerful goal management system.",
    target: "[data-tutorial='goals']",
    placement: "right",
  },
  {
    title: "Analytics",
    description: "View detailed analytics of your progress and achievements.",
    target: "[data-tutorial='analytics']",
    placement: "right",
  },
  {
    title: "Rewards",
    description: "Earn coins and rewards as you achieve your goals!",
    target: "[data-tutorial='rewards']",
    placement: "right",
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
