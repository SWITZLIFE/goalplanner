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
    <div className="w-[clamp(16rem,20vw,30rem)] bg-primary h-screen flex flex-col">
      {/* User Profile Section */}
      <div className="flex-none p-4 border-b border-white/10">
        <div className="flex flex-col items-center mt-14">
          <div 
            className="w-16 h-16 lg:w-24 lg:h-24 rounded-full overflow-hidden mb-3 cursor-pointer" 
            onClick={() => window.location.href = '/profile'}
          >
            <img 
              src={user?.profilePhotoUrl || 'https://github.com/shadcn.png'} 
              alt="Profile" 
              className="w-full h-full object-cover" 
            />
          </div>
          <h2 className="text-white font-medium text-sm lg:text-base mb-2">
            {user?.email?.split('@')[0] || 'User'}
          </h2>
          <div className="flex gap-3">
            {['calendar', 'facebook', 'instagram', 'linkedin'].map((social) => (
              <a 
                key={social}
                href={`https://${social}.com`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-400 hover:text-white transition-colors"
              >
                {social === 'calendar' ? <Calendar className="h-4 w-4" /> :
                 social === 'facebook' ? <Facebook className="h-4 w-4" /> :
                 social === 'instagram' ? <Instagram className="h-4 w-4" /> :
                 <Linkedin className="h-4 w-4" />}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Coins and Actions Section */}
      <div className="flex-none py-2 px-4 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-sm lg:text-base font-semibold text-white">Coin balance</h1>
          <CoinBalance />
        </div>
        <CreateGoalDialog />
      </div>

      {/* Goals Section */}
      <div className="flex flex-col px-4 py-2 h-[calc(100vh-430px)]">
        <h2 className="text-sm font-medium text-white mb-3">Your Goals</h2>
        <div className={cn(
          "overflow-y-auto pr-1 scrollbar-hide scroll-smooth",
          "snap-y snap-mandatory"
        )}>
          {goals.map((goal) => (
            <div key={goal.id} className="snap-start py-1 h-[calc((100vh-490px)/2)]">
              <GoalCard goal={goal} className="h-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Footer Section */}
      <div className="flex-none py-6 px-4">
        <h1 className="text-sm lg:text-base font-semibold text-white">Tutorial</h1>
        {/* Footer content if needed */}
      </div>
    </div>
  );
}