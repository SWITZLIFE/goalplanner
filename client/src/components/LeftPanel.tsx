import { Button } from "@/components/ui/button";
import { Gift, BarChart2, ChevronDown, ChevronRight, Calendar, Facebook, Instagram, Linkedin } from "lucide-react";
import { Link } from "wouter";
import { CoinBalance } from "@/components/rewards/CoinBalance";
import { CreateGoalDialog } from "@/components/goals/CreateGoalDialog";
import { GoalCard } from "@/components/goals/GoalCard";
import { useGoals } from "@/hooks/use-goals";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";

export function LeftPanel() {
  const { goals } = useGoals();
  const { user } = useUser();
  const [isGoalsOpen, setIsGoalsOpen] = useState(true);

  return (
    <div className="w-96 bg-primary h-screen overflow-hidden">
      
      <div className="p-6 pt-0">
        <div className="p-6 pb-0 mt-16">
          <div className="flex flex-col items-center mb-8">
            <div className="w-40 h-40 rounded-full overflow-hidden mb-3">
              <img src={user?.profilePhotoUrl || 'https://github.com/shadcn.png'} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-white font-medium text-lg">{user?.email?.split('@')[0] || 'User'}</h2>
            <p className="text-gray-400 text-sm">Product Designer</p>
            <div className="flex gap-4 mt-4">
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

        <div className="flex justify-between items-center pr-2 pl-2 pb-0 mb-4">
          <h1 className="text-l font-semibold text-white">Coin balance</h1>
          <CoinBalance />
        </div>
        <CreateGoalDialog />

        <div className="mt-4">
          <Link href="/rewards">
            <Button variant="subtle" className="w-full">
              <Gift className="mr-2 h-4 w-4" />
              Reward Store
            </Button>
          </Link>
          <Link href="/analytics" className="block mt-4">
            <Button variant="subtle" className="w-full">
              <BarChart2 className="mr-2 h-4 w-4" />
              View Analytics
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-6 flex flex-col">
        <h2 className="text-mm font-medium text-white mb-2">Your Goals</h2>
        <div className={cn(
          "h-[370px] overflow-y-auto pt-2 pb-2 space-y-3",
          "scrollbar-hide"
        )}>
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>

    </div>
  );
}