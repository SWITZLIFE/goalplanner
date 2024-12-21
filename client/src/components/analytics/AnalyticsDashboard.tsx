import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGoals } from "@/hooks/use-goals";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, subDays } from "date-fns";
import { Trophy, Target, Clock, TrendingUp, Award } from "lucide-react";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { triggerCelebration, getRewardAmount, getCelebrationMessage } from "@/lib/celebration";

export function AnalyticsDashboard() {
  const { goals } = useGoals();
  const { data: rewards } = useQuery<{ coins: number }>({
    queryKey: ["/api/rewards"],
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const lastCheckedProgressRef = useRef<Record<number, number>>({});
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
      
      const contentType = response.headers.get("content-type");
      if (!response.ok || !contentType?.includes("application/json")) {
        throw new Error("Failed to update rewards");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rewards'] });
    },
  });

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    goals.forEach(goal => {
      const lastProgress = lastCheckedProgressRef.current[goal.id] ?? 0;
      const currentProgress = goal.progress;

      if (currentProgress !== lastProgress && !goal.milestonesRewarded) {
        const checkMilestones = async () => {
          try {
            // Check if crossed 50% milestone
            if (lastProgress < 50 && currentProgress >= 50) {
              const rewardAmount = getRewardAmount(false);
              triggerCelebration(false);
              toast({
                title: getCelebrationMessage(false),
                description: `You've earned ${rewardAmount} coins for ${goal.title}!`,
                duration: 5000,
              });
              await updateRewardsMutation.mutateAsync(rewardAmount);
            }
            
            // Check if goal is completed
            if (lastProgress < 100 && currentProgress >= 100) {
              const rewardAmount = getRewardAmount(true);
              triggerCelebration(true);
              toast({
                title: getCelebrationMessage(true),
                description: `You've earned ${rewardAmount} coins for completing ${goal.title}!`,
                duration: 5000,
              });
              await updateRewardsMutation.mutateAsync(rewardAmount);

              // Update goal to mark milestones as rewarded
              await fetch(`/api/goals/${goal.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ milestonesRewarded: true })
              });
            }

            lastCheckedProgressRef.current[goal.id] = currentProgress;
          } catch (error) {
            console.error('Failed to process milestone:', error);
          }
        };

        checkMilestones();
      }
    });
  }, [goals, toast, updateRewardsMutation]);

  // Calculate stats
  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.progress === 100).length;
  const averageProgress = goals.reduce((sum, goal) => sum + goal.progress, 0) / Math.max(goals.length, 1);
  
  // Calculate tasks stats
  const allTasks = goals.flatMap(g => g.tasks || []);
  const completedTasks = allTasks.filter(t => t.completed).length;
  const totalTaskTime = allTasks.reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0);

  // Prepare progress data for the line chart
  const progressData = goals.map(goal => ({
    name: format(new Date(goal.targetDate), "MMM d"),
    progress: goal.progress,
  })).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

  // Prepare task completion data for the bar chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    const formattedDate = format(date, "MMM d");
    const dailyCompletedTasks = allTasks.filter(t => 
      t.completed && 
      format(new Date(t.createdAt), "MMM d") === formattedDate
    ).length;
    return {
      date: formattedDate,
      completed: dailyCompletedTasks,
    };
  }).reverse();

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Goals Overview</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGoals}</div>
            <p className="text-xs text-muted-foreground">
              {completedGoals} completed • {totalGoals - completedGoals} in progress
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Task Completion</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks}</div>
            <p className="text-xs text-muted-foreground">
              {((completedTasks / Math.max(allTasks.length, 1)) * 100).toFixed(1)}% of total tasks
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time Investment</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(allTasks.reduce((sum, task) => sum + (task.totalMinutesSpent || 0), 0) / 60)}h
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(totalTaskTime / 60)}h estimated to complete
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Progress Trends</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis unit="%" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="progress"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Daily Task Completion</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7Days} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completed" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
