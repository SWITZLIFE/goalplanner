import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface DailyInspirationProps {
  goalId: number;
  goalTitle: string;
}

interface Inspiration {
  content: string | null;
}

export function DailyInspiration({ goalId, goalTitle }: DailyInspirationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Query to fetch today's inspiration if it exists
  const { data: inspiration, isLoading } = useQuery<Inspiration>({
    queryKey: [`/api/goals/${goalId}/inspiration`, today],
    queryFn: async () => {
      const response = await fetch(`/api/goals/${goalId}/inspiration?date=${today}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch inspiration');
      }
      return response.json();
    }
  });

  const handleGenerateInspiration = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setIsOpen(true);
    try {
      const response = await fetch(`/api/goals/${goalId}/inspiration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error("Failed to generate inspiration");
      }

      const data = await response.json();

      // Invalidate the query to refetch the inspiration
      await queryClient.invalidateQueries({ 
        queryKey: [`/api/goals/${goalId}/inspiration`, today]
      });
    } catch (error) {
      console.error('Failed to generate inspiration:', error);
      toast({
        title: "Error",
        description: "Failed to generate your daily inspiration. Please try again.",
        variant: "destructive",
      });
      setIsOpen(false);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mb-6">
      <Button
        variant="outline"
        size="lg"
        className="w-full gap-2 h-auto py-4 relative overflow-hidden group border-2 hover:border-primary/50"
        onClick={() => {
          if (inspiration?.content) {
            setIsOpen(true);
          } else {
            handleGenerateInspiration();
          }
        }}
        disabled={isGenerating || isLoading}
      >
        <Mail className="h-5 w-5" />
        <span className="font-medium">
          {isLoading ? (
            "Loading..."
          ) : inspiration?.content ? (
            "Read Today's Inspiration"
          ) : (
            "Get Today's Inspiration"
          )}
        </span>
        {isGenerating && (
          <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
            />
          </div>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Today's Inspiration</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div
                    key="generating"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center p-6 space-y-4"
                  >
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 180, 360]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Mail className="h-8 w-8 text-primary" />
                    </motion.div>
                    <p className="text-lg text-center text-muted-foreground">
                      Your letter of inspiration is arriving...
                    </p>
                  </motion.div>
                ) : inspiration?.content ? (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-primary/5 p-6 rounded-lg space-y-4"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    >
                      <p className="text-lg leading-relaxed whitespace-pre-wrap">
                        {inspiration.content.split('\n').map((paragraph, index) => (
                          <motion.span
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.2 }}
                            className="block mb-4"
                          >
                            {paragraph}
                          </motion.span>
                        ))}
                      </p>
                    </motion.div>
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 1 }}
                      className="text-sm text-muted-foreground text-right"
                    >
                      {format(new Date(), 'MMMM d, yyyy')}
                    </motion.p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}