import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";
import { useGoals } from "@/hooks/use-goals";
import { useToast } from "@/hooks/use-toast";

export function CreateGoalDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [totalTasks, setTotalTasks] = useState("0");
  const [isLoading, setIsLoading] = useState(false);

  const { createGoal } = useGoals();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    setIsLoading(true);
    e.preventDefault();
    try {
      await createGoal({
        title,
        targetDate: new Date(targetDate),
        totalTasks: parseInt(totalTasks),
      });
      setOpen(false);
      toast({
        title: "Goal created",
        description: parseInt(totalTasks) > 0 
          ? "Your new goal has been created with AI-generated tasks." 
          : "Your new goal has been created. You can now add your own tasks.",
      });
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to create goal. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="subtle" className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New Goal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Goal</DialogTitle>
          <DialogDescription>
            Set up a new goal with a target date and optional AI-generated tasks to help you get started.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">What's your goal?</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your goal..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Target completion date</Label>
            <Input
              id="date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tasks">
              Number of tasks to generate (0 for no AI-generated tasks)
            </Label>
            <Input
              id="tasks"
              type="number"
              min="0"
              value={totalTasks}
              onChange={(e) => setTotalTasks(e.target.value)}
              required
            />
            {totalTasks === "0" && (
              <p className="text-sm text-muted-foreground mt-1">
                You'll be able to add your own tasks after creating the goal.
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {parseInt(totalTasks) > 0 ? 'Generating Tasks...' : 'Creating Goal...'}
              </>
            ) : (
              'Create Goal'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}