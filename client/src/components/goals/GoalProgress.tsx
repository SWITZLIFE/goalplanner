import { useEffect, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { triggerCelebration, getRewardAmount, getCelebrationMessage } from "@/lib/celebration";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface GoalProgressProps {
  progress: number;
  previousProgress?: number;
}

export function GoalProgress({ progress, previousProgress = 0 }: GoalProgressProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const lastCheckedProgressRef = useRef(previousProgress);
  const isInitialMount = useRef(true);

  // Mutation for updating rewards
  const updateRewardsMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
        credentials: 'include',
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update rewards: ${errorText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rewards'] });
    },
  });

  useEffect(() => {
    // Skip the first render to avoid duplicate celebrations
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Only check for milestones if progress has changed
    if (progress !== lastCheckedProgressRef.current) {
      const checkMilestones = async () => {
        try {
          console.log('Checking milestones:', { 
            progress, 
            lastCheckedProgress: lastCheckedProgressRef.current, 
            crossedHalf: lastCheckedProgressRef.current < 50 && progress >= 50,
            crossedComplete: lastCheckedProgressRef.current < 100 && progress >= 100
          });

          // Check if crossed 50% milestone
          if (lastCheckedProgressRef.current < 50 && progress >= 50) {
            const rewardAmount = getRewardAmount(false);
            triggerCelebration(false);
            toast({
              title: getCelebrationMessage(false),
              description: `You've earned ${rewardAmount} coins!`,
              duration: 5000,
            });
            await updateRewardsMutation.mutateAsync(rewardAmount);
          }
          
          // Check if goal is completed
          if (lastCheckedProgressRef.current < 100 && progress >= 100) {
            const rewardAmount = getRewardAmount(true);
            triggerCelebration(true);
            toast({
              title: getCelebrationMessage(true),
              description: `You've earned ${rewardAmount} coins!`,
              duration: 5000,
            });
            await updateRewardsMutation.mutateAsync(rewardAmount);
          }

          lastCheckedProgressRef.current = progress;
        } catch (error) {
          console.error('Failed to process milestone:', error);
          toast({
            title: "Error",
            description: "Failed to process milestone rewards",
            variant: "destructive",
          });
        }
      };

      checkMilestones();
    }

    // Cleanup function
    return () => {
      lastCheckedProgressRef.current = progress;
    };
  }, [progress, toast, updateRewardsMutation]);

  return (
    <div className="space-y-2">
      <Progress value={progress} className="h-2" />
    </div>
  );
}
