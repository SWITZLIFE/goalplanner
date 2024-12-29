import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGoals } from "@/hooks/use-goals";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, subDays } from "date-fns";
import { Trophy, Target, Clock, TrendingUp, Award } from "lucide-react";
import { motion } from "framer-motion";

const cardVariants = {
  hidden: { 
    opacity: 0,
    y: 20
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30
    }
  }
};

const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const chartVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

export function AnalyticsDashboard() {
  const { goals } = useGoals();
  const { data: rewards } = useQuery<{ coins: number }>({
    queryKey: ["/api/rewards"],
  });

  // Calculate stats
  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.progress === 100).length;
  const averageProgress = goals.reduce((sum, goal) => sum + goal.progress, 0) / Math.max(goals.length, 1);

  const allTasks = goals.flatMap(g => g.tasks || []);
  const completedTasks = allTasks.filter(t => t.completed).length;
  const totalTaskTime = allTasks.reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0);

  const progressData = goals.map(goal => ({
    name: format(new Date(goal.targetDate), "MMM d"),
    progress: goal.progress,
  })).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

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
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-4 md:grid-cols-3"
      >
        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Goals Overview</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="text-2xl font-bold"
              >
                {totalGoals}
              </motion.div>
              <p className="text-xs text-muted-foreground">
                {completedGoals} completed • {totalGoals - completedGoals} in progress
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Task Completion</CardTitle>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                className="text-2xl font-bold"
              >
                {completedTasks}
              </motion.div>
              <p className="text-xs text-muted-foreground">
                {((completedTasks / Math.max(allTasks.length, 1)) * 100).toFixed(1)}% of total tasks
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Time Investment</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
                className="text-2xl font-bold"
              >
                {Math.floor(allTasks.reduce((sum, task) => sum + (task.totalMinutesSpent || 0), 0) / 60)}h
              </motion.div>
              <p className="text-xs text-muted-foreground">
                {Math.round(totalTaskTime / 60)}h estimated to complete
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div variants={chartVariants} initial="hidden" animate="visible">
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
        </motion.div>

        <motion.div variants={chartVariants} initial="hidden" animate="visible">
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
        </motion.div>
      </div>
    </div>
  );
}