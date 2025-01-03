import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGoals } from "@/hooks/use-goals";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Area, AreaChart } from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { Trophy, Target, Clock, TrendingUp, Award, Coins } from "lucide-react";
import { motion } from "framer-motion";

interface LeaderboardEntry {
  id: number;
  username: string;
  coins: number;
  lastUpdated: string;
}

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
      stiffness: 300,
      damping: 25,
      duration: 0.5
    }
  }
};

const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1
    }
  }
};

const chartVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.7,
      delay: 0.6,
      ease: "easeOut"
    }
  }
};

export function AnalyticsDashboard() {
  const { goals } = useGoals();
  const { data: rewards } = useQuery<{ coins: number }>({
    queryKey: ["/api/rewards"],
  });
  const { data: coinHistory } = useQuery<Array<{ amount: number; balance: number; timestamp: string }>>({
    queryKey: ["/api/rewards/history"],
  });
  const { data: leaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/rewards/leaderboard"],
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

  // Transform coin history data to show daily earnings
  const dailyEarnings = coinHistory?.reduce<Record<string, number>>((acc, entry) => {
    const date = format(parseISO(entry.timestamp), "MMM d");
    acc[date] = (acc[date] || 0) + entry.amount;
    return acc;
  }, {}) ?? {};

  // Convert to array format for chart
  const coinData = Object.entries(dailyEarnings).map(([date, earnings]) => ({
    date,
    earnings,
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
              <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
              <Coins className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="text-2xl font-bold"
              >
                {rewards?.coins ?? 0}
              </motion.div>
              <p className="text-xs text-muted-foreground">
                Total coins earned
              </p>
            </CardContent>
          </Card>
        </motion.div>

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
              <CardTitle className="text-sm font-medium">Time Investment</CardTitle>
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
              <CardTitle className="text-base">Daily Coin Earnings</CardTitle>
              <Coins className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={coinData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.01}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="earnings" 
                      stroke="hsl(var(--primary))" 
                      fill="url(#colorEarnings)"
                      strokeWidth={2}
                    />
                  </AreaChart>
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

      <motion.div
        variants={chartVariants}
        initial="hidden"
        animate="visible"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Top Earners</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leaderboard?.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-300 text-black' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-muted-foreground/20'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium">{entry.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span>{entry.coins}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}