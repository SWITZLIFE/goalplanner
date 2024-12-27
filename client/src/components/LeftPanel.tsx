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

export function LeftPanel() {
  const { goals } = useGoals();
  const [isGoalsOpen, setIsGoalsOpen] = useState(true);
  const user = { profilePhotoUrl: 'https://github.com/shadcn.png', email: 'user@example.com' }; //Example User Data

  return (
    <div className="w-96 bg-primary h-screen overflow-hidden">
      <div className="flex justify-between items-center p-6 pb-0 mt-10 mb-10">
        <h1 className="text-l font-semibold text-white">Coin balance</h1>
        <CoinBalance />
      </div>
      <div className="p-6 pt-0">
        <div className="p-6 pb-0 mt-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-full overflow-hidden mb-3">
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

      <Collapsible
        open={isGoalsOpen}
        onOpenChange={setIsGoalsOpen}
        className="px-6 flex flex-col h-[calc(90vh-280px)]"
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full mb-2">
          <h2 className="text-mm font-medium text-white">Your Goals</h2>
          {isGoalsOpen ? (
            <ChevronDown className="h-4 w-4 text-white" />
          ) : (
            <ChevronRight className="h-4 w-4 text-white" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className={cn(
          "overflow-y-auto scrollbar-hide pt-2 pb-2 space-y-3",
          "data-[state=open]:animate-collapsible-down",
          "data-[state=closed]:animate-collapsible-up"
        )}>
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </CollapsibleContent>
      </Collapsible>

      <div>
        <h2 className="text-sm font-small text-white p-6">Created with ❤️</h2>
      </div>
    </div>
  );
}