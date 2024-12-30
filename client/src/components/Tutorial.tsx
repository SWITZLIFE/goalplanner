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
        // Add dim effect to other elements
        document.body.classList.add('tutorial-active');

        return () => {
          // Clean up highlight and dim effect
          targetElement.classList.remove('tutorial-highlight');
          document.body.classList.remove('tutorial-active');
        };
      }
    }
  }, [isOpen, currentStep, currentTutorialStep.target]);

  useEffect(() => {
    // Add the global styles for tutorial highlight when component mounts
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
      .tutorial-highlight {
        position: relative;
        z-index: 60 !important;
        box-shadow: 0 0 0 4px hsl(var(--primary)) !important;
        border-radius: 4px;
        transition: all 0.2s ease;
      }

      .tutorial-active > *:not(.tutorial-highlight):not([role="dialog"]) {
        transition: opacity 0.2s ease;
        opacity: 0.3;
      }

      .tutorial-highlight::after {
        content: '';
        position: absolute;
        inset: -8px;
        background: hsl(var(--primary) / 0.1);
        border-radius: 8px;
        z-index: -1;
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