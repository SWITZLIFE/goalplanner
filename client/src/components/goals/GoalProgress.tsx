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
  const hasCheckedRef = useRef<boolean>(false);

  // Mutation for updating rewards
  const updateRewardsMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      if (!response.ok) throw new Error('Failed to update rewards');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rewards'] });
    },
  });

  useEffect(() => {
    // Only check for milestones if we haven't checked this progress value before
    if (!hasCheckedRef.current && progress !== previousProgress) {
      const checkMilestones = async () => {
        // Check if crossed 50% milestone
        if (previousProgress < 50 && progress >= 50) {
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
        if (previousProgress < 100 && progress >= 100) {
          const rewardAmount = getRewardAmount(true);
          triggerCelebration(true);
          toast({
            title: getCelebrationMessage(true),
            description: `You've earned ${rewardAmount} coins!`,
            duration: 5000,
          });
          await updateRewardsMutation.mutateAsync(rewardAmount);
        }
      };

      checkMilestones();
      hasCheckedRef.current = true;
    }
  }, [progress, previousProgress, toast, updateRewardsMutation]);

  return (
    <div className="space-y-2">
      <Progress value={progress} className="h-2" />
    </div>
  );
}
