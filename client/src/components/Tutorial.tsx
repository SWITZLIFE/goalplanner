import { useTutorial } from "@/contexts/TutorialContext";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

export function Tutorial() {
  const { isOpen, currentStep, steps, endTutorial, nextStep, previousStep } =
    useTutorial();

  const currentTutorialStep = steps[currentStep];

  useEffect(() => {
    if (isOpen && currentTutorialStep.target) {
      const targetElement = document.querySelector(currentTutorialStep.target);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add highlight class
        targetElement.classList.add('tutorial-highlight');

        return () => {
          // Clean up highlight
          targetElement.classList.remove('tutorial-highlight');
        };
      }
    }
  }, [isOpen, currentStep, currentTutorialStep.target]);

  useEffect(() => {
    // Add the global styles for tutorial highlight when component mounts
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
      .tutorial-highlight {
        outline: 3px solid hsl(var(--primary)) !important;
        outline-offset: 4px;
        border-radius: 4px;
        transition: outline-offset 0.2s ease;
        position: relative;
        z-index: 50;
      }
    `;
    document.head.appendChild(styleSheet);

    // Cleanup when component unmounts
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <Drawer open={isOpen} onOpenChange={endTutorial}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{currentTutorialStep.title}</DrawerTitle>
          <DrawerDescription>
            {currentTutorialStep.description}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="pt-2">
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              onClick={previousStep}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            <Button onClick={nextStep}>
              {currentStep === steps.length - 1 ? "Finish" : "Next"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}