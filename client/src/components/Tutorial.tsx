import { useTutorial } from "@/contexts/TutorialContext";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { motion, AnimatePresence } from "framer-motion";

export function Tutorial() {
  const { isOpen, currentStep, steps, endTutorial, nextStep, previousStep } =
    useTutorial();

  const currentTutorialStep = steps[currentStep];

  if (!isOpen) return null;

  return (
    <>
      <Drawer open={isOpen} onOpenChange={endTutorial}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{currentTutorialStep.title}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4">
            <p className="text-sm text-muted-foreground">
              {currentTutorialStep.description}
            </p>
          </div>
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

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 pointer-events-none z-40"
          />
        )}
      </AnimatePresence>
    </>
  );
}
