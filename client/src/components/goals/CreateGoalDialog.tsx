import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  const [totalTasks, setTotalTasks] = useState("1");
  
  const { createGoal } = useGoals();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
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
        description: "Your new goal has been created successfully.",
      });
    } catch (error) {
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
        <Button className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New Goal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Goal</DialogTitle>
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
            <Label htmlFor="tasks">Number of tasks to generate</Label>
            <Input
              id="tasks"
              type="number"
              min="1"
              value={totalTasks}
              onChange={(e) => setTotalTasks(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full">Create Goal</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
