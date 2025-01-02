import { VisionBoard } from "@/components/vision-board/VisionBoard";
import { LeftPanel } from "@/components/LeftPanel";
import { PageHeader } from "@/components/PageHeader";
import { useGoals } from "@/hooks/use-goals";
import { Loader2 } from "lucide-react";
import { DailyInspiration } from "@/components/goals/DailyInspiration";

export default function Dashboard() {
  const { isLoading, goals } = useGoals();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Get the first active goal for daily inspiration
  const activeGoal = goals[0];

  return (
    <div className="flex h-screen bg-primary">
      <LeftPanel />
      <div className="flex-1 flex flex-col">
        <PageHeader />
        <div 
          className="flex-1 m-4 bg-background rounded-[30px] overflow-hidden mb-8"
        >
          <div className="h-full overflow-auto scrollbar-hide py-10 px-14">
            <div className="max-w-8xl mx-auto space-y-6">
              {activeGoal && (
                <DailyInspiration 
                  goalId={activeGoal.id} 
                  goalTitle={activeGoal.title} 
                />
              )}
              <VisionBoard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}