import { Button } from "@/components/ui/button";
import { Gift, BarChart2 } from "lucide-react";
import { Link } from "wouter";
import { CoinBalance } from "@/components/rewards/CoinBalance";
import { CreateGoalDialog } from "@/components/goals/CreateGoalDialog";
import { GoalCard } from "@/components/goals/GoalCard";
import { useGoals } from "@/hooks/use-goals";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody } from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";


export function LeftPanel() {
  const { goals } = useGoals();

  return (
    <div className="w-96 border-r p-6 bg-purple-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-l font-semibold">Coin balance</h1>
        <CoinBalance />
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="subtle" className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Goal
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Goal</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {/* Add your create goal form here */}
          </DialogBody>
          <DialogFooter>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <div className="mt-6">
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

      <div className="mt-8 space-y-6">
        <h2 className="text-sm font-medium text-gray-600 mb-4">Your Goals</h2>
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
      </div>
    </div>
  );
}