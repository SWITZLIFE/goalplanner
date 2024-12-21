import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";

// Define the questions to ask the user
const VISION_QUESTIONS = [
  "What inspired you to set this goal? What's the deeper reason behind it?",
  "How will achieving this goal change your life or impact others around you?",
  "What does success look like for you with this goal? Be specific.",
  "What strengths and personal experiences will help you achieve this goal?"
];

interface VisionGeneratorProps {
  goalId: number;
  onVisionGenerated: (vision: string) => void;
}

export function VisionGenerator({ goalId, onVisionGenerated }: VisionGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleNext = () => {
    if (!answers[currentQuestionIndex]?.trim()) {
      toast({
        title: "Please answer the question",
        description: "Your response helps create a meaningful vision statement.",
        variant: "destructive",
      });
      return;
    }
    
    if (currentQuestionIndex < VISION_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      generateVision();
    }
  };

  const generateVision = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/goals/${goalId}/vision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate vision statement");
      }

      const data = await response.json();
      onVisionGenerated(data.visionStatement);
      setIsOpen(false);
      toast({
        title: "Vision Statement Generated!",
        description: "Your personalized vision statement is ready to inspire you.",
      });
    } catch (error) {
      console.error("Failed to generate vision:", error);
      toast({
        title: "Error",
        description: "Failed to generate vision statement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetAndOpen = () => {
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setIsOpen(true);
  };

  return (
    <>
      <Button 
        onClick={resetAndOpen}
        className="w-full"
        variant="outline"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Craft Your Vision
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Craft Your Vision</DialogTitle>
            <DialogDescription>
              Let's understand your motivation and create a powerful vision statement.
              Question {currentQuestionIndex + 1} of {VISION_QUESTIONS.length}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="font-medium">
              {VISION_QUESTIONS[currentQuestionIndex]}
            </div>
            <Textarea
              value={answers[currentQuestionIndex] || ''}
              onChange={(e) => {
                const newAnswers = [...answers];
                newAnswers[currentQuestionIndex] = e.target.value;
                setAnswers(newAnswers);
              }}
              placeholder="Share your thoughts..."
              className="min-h-[100px]"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleNext}
              disabled={isGenerating}
            >
              {currentQuestionIndex < VISION_QUESTIONS.length - 1 ? (
                "Next Question"
              ) : (
                isGenerating ? "Generating..." : "Generate Vision"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
