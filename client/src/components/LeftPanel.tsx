import { Button } from "@/components/ui/button";
import { Gift, BarChart2, Calendar, Facebook, Instagram, Linkedin } from "lucide-react";
import { Link } from "wouter";
import { CoinBalance } from "@/components/rewards/CoinBalance";
import { CreateGoalDialog } from "@/components/goals/CreateGoalDialog";
import { GoalCard } from "@/components/goals/GoalCard";
import { useGoals } from "@/hooks/use-goals";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";

export function LeftPanel() {
  const { goals } = useGoals();
  const { user } = useUser();
  const [isGoalsOpen, setIsGoalsOpen] = useState(true);

  return (
    <div className="w-[clamp(16rem,20vw,25rem)] bg-primary h-screen overflow-hidden flex flex-col">
      {/* Top Section */}
      <div className="p-3 lg:p-4 flex-none">
        <div className="py-2 lg:py-3 mb-4 lg:mb-6">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-full overflow-hidden mb-2">
              <img src={user?.profilePhotoUrl || 'https://github.com/shadcn.png'} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-white font-medium text-sm lg:text-base">{user?.email?.split('@')[0] || 'User'}</h2>
            <div className="flex gap-2 mt-2">
              <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <Calendar className="h-4 w-4" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-3">
          <h1 className="text-sm lg:text-base font-semibold text-white">Coin balance</h1>
          <CoinBalance />
        </div>
        <CreateGoalDialog />

        <div className="mt-3 space-y-2">
          <Link href="/rewards">
            <Button variant="subtle" className="w-full text-xs lg:text-sm py-1.5">
              <Gift className="mr-2 h-4 w-4" />
              Reward Store
            </Button>
          </Link>
        </div>
        <div className="mt-3 space-y-2">  
          <Link href="/analytics">
            <Button variant="subtle" className="w-full text-xs lg:text-sm py-1.5">
              <BarChart2 className="mr-2 h-4 w-4" />
              View Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Goals Section - Scrollable */}
      <div className="px-3 lg:px-4 flex-1 min-h-0">
        <h2 className="text-sm font-medium text-white mb-2">Your Goals</h2>
        <div className={cn(
          "h-full overflow-y-auto space-y-2 pr-1 pb-4 pt-4 mb-4",
          "scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        )}>
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>

      {/* Footer Section */}
      <div className="p-3 lg:p-4 border-t border-white/10 mt-auto flex-none">
        <div className="text-xs lg:text-sm text-gray-400">
          <p>Check out our user guide or contact support for assistance.</p>
        </div>
      </div>
    </div>
  );
}